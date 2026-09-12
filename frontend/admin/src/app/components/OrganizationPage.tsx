import React, { useState } from 'react';
import {
  Building2,
  Users,
  MapPin,
  Shield,
  Plus,
  Edit,
  Trash2,
  Search,
  Filter,
  RefreshCw,
  Layers,
  CheckCircle2,
  XCircle,
  Clock,
  UserCheck,
  AlertTriangle,
  Info,
  ChevronRight,
  ChevronDown,
  UserPlus,
  ArrowRight,
  X,
  ExternalLink,
  Lock,
  Globe,
  Database,
  Calendar,
  Compass,
} from 'lucide-react';
import {
  organizationApi,
  Department,
  Unit,
  StateItem,
  DistrictItem,
  GeographicAssignment,
} from '../../api/organization.api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PositionsTab } from './PositionsTab';
import { usePermissions } from '../../hooks/usePermissions';

export const OrganizationPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { hasPermission, isSuperAdmin } = usePermissions();

  // Tabs
  const [activeTab, setActiveTab] = useState<'departments' | 'units' | 'positions' | 'geography' | 'audit'>('departments');

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedDepartmentFilter, setSelectedDepartmentFilter] = useState<string>('ALL');
  const [selectedStateFilter, setSelectedStateFilter] = useState<string>('ALL');

  // Modals & Drawers State
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [selectedDeptDrawer, setSelectedDeptDrawer] = useState<Department | null>(null);

  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [selectedUnitDrawer, setSelectedUnitDrawer] = useState<Unit | null>(null);
  const [isAssignMemberModalOpen, setIsAssignMemberModalOpen] = useState(false);
  const [targetUnitForMember, setTargetUnitForMember] = useState<Unit | null>(null);

  const [isGeoModalOpen, setIsGeoModalOpen] = useState(false);
  const [editingGeoAssignment, setEditingGeoAssignment] = useState<GeographicAssignment | null>(null);
  const [selectedGeoHistory, setSelectedGeoHistory] = useState<{ stateId: string; stateName: string; districtId?: string; districtName?: string } | null>(null);

  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Queries
  const { data: departments = [], isLoading: isLoadingDepts, refetch: refetchDepts } = useQuery<Department[]>({
    queryKey: ['departments', searchTerm, statusFilter],
    queryFn: () =>
      organizationApi.getDepartments({
        search: searchTerm || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
      }),
  });

  const { data: units = [], isLoading: isLoadingUnits, refetch: refetchUnits } = useQuery<Unit[]>({
    queryKey: ['units', searchTerm, statusFilter, selectedDepartmentFilter],
    queryFn: () =>
      organizationApi.getUnits({
        search: searchTerm || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        departmentId: selectedDepartmentFilter !== 'ALL' ? selectedDepartmentFilter : undefined,
      }),
  });

  const { data: states = [], refetch: refetchStates } = useQuery<StateItem[]>({
    queryKey: ['states'],
    queryFn: () => organizationApi.getStates(),
  });

  const { data: geoAssignments = [], isLoading: isLoadingGeo, refetch: refetchGeo } = useQuery<GeographicAssignment[]>({
    queryKey: ['geoAssignments', searchTerm, statusFilter, selectedStateFilter],
    queryFn: () =>
      organizationApi.getAssignments({
        search: searchTerm || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        stateId: selectedStateFilter !== 'ALL' ? selectedStateFilter : undefined,
      }),
  });

  const { data: singleDeptDetail, isLoading: isLoadingSingleDept } = useQuery({
    queryKey: ['singleDepartment', selectedDeptDrawer?.id],
    queryFn: () => organizationApi.getDepartmentById(selectedDeptDrawer!.id),
    enabled: !!selectedDeptDrawer?.id,
  });

  const { data: singleUnitDetail, isLoading: isLoadingSingleUnit } = useQuery({
    queryKey: ['singleUnit', selectedUnitDrawer?.id],
    queryFn: () => organizationApi.getUnitById(selectedUnitDrawer!.id),
    enabled: !!selectedUnitDrawer?.id,
  });

  const { data: geoHistoryData, isLoading: isLoadingGeoHistory } = useQuery({
    queryKey: ['geoHistory', selectedGeoHistory?.stateId, selectedGeoHistory?.districtId],
    queryFn: () => organizationApi.getAssignmentHistory(selectedGeoHistory!.stateId, selectedGeoHistory?.districtId),
    enabled: !!selectedGeoHistory?.stateId,
  });

  // KPI Calculations
  const activeDeptsCount = departments.filter((d) => d.status === 'ACTIVE').length;
  const activeUnitsCount = units.filter((u) => u.status === 'ACTIVE').length;
  const totalMembersCount = units.reduce((acc, u) => acc + (u.membersCount || 0), 0);
  const activeAssignmentsCount = geoAssignments.filter((g) => g.status === 'ACTIVE').length;

  // Mutations
  const createDeptMutation = useMutation({
    mutationFn: organizationApi.createDepartment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      setIsDeptModalOpen(false);
      showToast('Department created successfully');
    },
    onError: (err: any) => {
      showToast(err?.response?.data?.message || 'Failed to create department', 'error');
    },
  });

  const updateDeptMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => organizationApi.updateDepartment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      queryClient.invalidateQueries({ queryKey: ['singleDepartment'] });
      setIsDeptModalOpen(false);
      setEditingDept(null);
      showToast('Department updated successfully');
    },
    onError: (err: any) => {
      showToast(err?.response?.data?.message || 'Failed to update department', 'error');
    },
  });

  const toggleDeptStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      organizationApi.updateDepartmentStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      showToast('Department status updated');
    },
    onError: (err: any) => {
      showToast(err?.response?.data?.message || 'Failed to update status', 'error');
    },
  });

  const createUnitMutation = useMutation({
    mutationFn: organizationApi.createUnit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
      setIsUnitModalOpen(false);
      showToast('Organizational unit created successfully');
    },
    onError: (err: any) => {
      showToast(err?.response?.data?.message || 'Failed to create unit', 'error');
    },
  });

  const updateUnitMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => organizationApi.updateUnit(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
      queryClient.invalidateQueries({ queryKey: ['singleUnit'] });
      setIsUnitModalOpen(false);
      setEditingUnit(null);
      showToast('Unit updated successfully');
    },
    onError: (err: any) => {
      showToast(err?.response?.data?.message || 'Failed to update unit', 'error');
    },
  });

  const assignMemberMutation = useMutation({
    mutationFn: ({ unitId, data }: { unitId: string; data: any }) =>
      organizationApi.assignUnitMember(unitId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
      queryClient.invalidateQueries({ queryKey: ['singleUnit'] });
      setIsAssignMemberModalOpen(false);
      showToast('Member assigned to unit successfully');
    },
    onError: (err: any) => {
      showToast(err?.response?.data?.message || 'Failed to assign member', 'error');
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: ({ unitId, userId }: { unitId: string; userId: string }) =>
      organizationApi.removeUnitMember(unitId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
      queryClient.invalidateQueries({ queryKey: ['singleUnit'] });
      showToast('Member removed from unit');
    },
    onError: (err: any) => {
      showToast(err?.response?.data?.message || 'Failed to remove member', 'error');
    },
  });

  const createGeoMutation = useMutation({
    mutationFn: organizationApi.createAssignment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['geoAssignments'] });
      setIsGeoModalOpen(false);
      showToast('Geographic responsibility assigned successfully');
    },
    onError: (err: any) => {
      showToast(err?.response?.data?.message || 'Failed to create assignment', 'error');
    },
  });

  const updateGeoMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => organizationApi.updateAssignment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['geoAssignments'] });
      setIsGeoModalOpen(false);
      setEditingGeoAssignment(null);
      showToast('Geographic responsibility reassigned (history preserved)');
    },
    onError: (err: any) => {
      showToast(err?.response?.data?.message || 'Failed to update assignment', 'error');
    },
  });

  const seedGeoMutation = useMutation({
    mutationFn: organizationApi.seedGeography,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['states'] });
      queryClient.invalidateQueries({ queryKey: ['geoAssignments'] });
      showToast(data.message || 'Geographic registry verified and seeded');
    },
    onError: (err: any) => {
      showToast(err?.response?.data?.message || 'Failed to seed geography', 'error');
    },
  });

  return (
    <div className="p-5 lg:p-8 space-y-6" style={{ background: '#F8FAFC', minHeight: '100vh' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border text-sm font-medium transition-all transform animate-in slide-in-from-top-2 bg-white ${
            toastMessage.type === 'success'
              ? 'border-emerald-200 text-emerald-800'
              : toastMessage.type === 'error'
              ? 'border-rose-200 text-rose-800'
              : 'border-slate-200 text-slate-800'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : toastMessage.type === 'error' ? (
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          ) : (
            <Info className="w-5 h-5 text-slate-500 shrink-0" />
          )}
          <span className="font-semibold">{toastMessage.text}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 text-slate-400 hover:text-slate-700 p-0.5 rounded transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl border border-[#F1F5F9]" style={{ background: '#E8F3EC' }}>
              <Building2 className="w-6 h-6" style={{ color: '#4A7B5B' }} />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: '#0F172A' }}>Organization Structure</h1>
              <p className="text-xs" style={{ color: '#94A3B8' }}>
                Departments, organizational units & teams, and geographic responsibility mapping
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          {activeTab === 'departments' && (
            <button
              onClick={() => {
                setEditingDept(null);
                setIsDeptModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white font-medium text-sm transition-all shadow-sm hover:scale-[1.02]"
              style={{ background: '#4A7B5B' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#3b664a')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#4A7B5B')}
            >
              <Plus className="w-4 h-4" />
              <span>Create Department</span>
            </button>
          )}

          {activeTab === 'units' && (
            <button
              onClick={() => {
                setEditingUnit(null);
                setIsUnitModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white font-medium text-sm transition-all shadow-sm hover:scale-[1.02]"
              style={{ background: '#4A7B5B' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#3b664a')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#4A7B5B')}
            >
              <Plus className="w-4 h-4" />
              <span>Create Unit / Team</span>
            </button>
          )}

          {activeTab === 'geography' && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => seedGeoMutation.mutate()}
                disabled={seedGeoMutation.isPending}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white hover:bg-gray-50 text-slate-600 text-sm font-medium border border-[#E2E8F0] transition-all shadow-2xs"
                title="Seed standard Indian states and districts"
              >
                <Compass className={`w-4 h-4 ${seedGeoMutation.isPending ? 'animate-spin' : ''}`} style={{ color: '#4A7B5B' }} />
                <span>Seed States & Districts</span>
              </button>
              <button
                onClick={() => {
                  setEditingGeoAssignment(null);
                  setIsGeoModalOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white font-medium text-sm transition-all shadow-sm hover:scale-[1.02]"
                style={{ background: '#4A7B5B' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#3b664a')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#4A7B5B')}
              >
                <Plus className="w-4 h-4" />
                <span>Assign Responsibility</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-[#F1F5F9]" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#94A3B8' }}>Departments</span>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#E8F3EC' }}>
              <Building2 className="w-4 h-4" style={{ color: '#4A7B5B' }} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold" style={{ color: '#0F172A' }}>{departments.length}</span>
            <span className="text-xs font-medium" style={{ color: '#4A7B5B' }}>({activeDeptsCount} Active)</span>
          </div>
          <p className="mt-1 text-xs" style={{ color: '#94A3B8' }}>Corporate & Operational divisions</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#F1F5F9]" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#94A3B8' }}>Units & Teams</span>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#E8F3EC' }}>
              <Layers className="w-4 h-4" style={{ color: '#4A7B5B' }} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold" style={{ color: '#0F172A' }}>{units.length}</span>
            <span className="text-xs font-medium" style={{ color: '#4A7B5B' }}>({activeUnitsCount} Active)</span>
          </div>
          <p className="mt-1 text-xs" style={{ color: '#94A3B8' }}>Operational hierarchy & squads</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#F1F5F9]" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#94A3B8' }}>Unit Memberships</span>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#D1FAE5' }}>
              <Users className="w-4 h-4" style={{ color: '#10B981' }} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold" style={{ color: '#0F172A' }}>{totalMembersCount}</span>
            <span className="text-xs font-medium" style={{ color: '#10B981' }}>Assigned</span>
          </div>
          <p className="mt-1 text-xs" style={{ color: '#94A3B8' }}>Operational roster (Distinct from Roles)</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#F1F5F9]" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#94A3B8' }}>Geographic Mappings</span>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#FEF3C7' }}>
              <MapPin className="w-4 h-4" style={{ color: '#F0AE1A' }} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold" style={{ color: '#0F172A' }}>{geoAssignments.length}</span>
            <span className="text-xs font-medium" style={{ color: '#F0AE1A' }}>({activeAssignmentsCount} Active)</span>
          </div>
          <p className="mt-1 text-xs" style={{ color: '#94A3B8' }}>Responsible Senior Counselors</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-4 border-b border-[#E2E8F0] overflow-x-auto">
        <button
          onClick={() => setActiveTab('departments')}
          className="flex items-center gap-1.5 py-3 px-2 text-xs font-extrabold border-b-2 transition-all"
          style={{
            borderColor: activeTab === 'departments' ? '#4A7B5B' : 'transparent',
            color: activeTab === 'departments' ? '#4A7B5B' : '#94A3B8',
          }}
        >
          <Building2 className="w-4 h-4" />
          <span>Departments</span>
          <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-500">
            {departments.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('units')}
          className="flex items-center gap-1.5 py-3 px-2 text-xs font-extrabold border-b-2 transition-all"
          style={{
            borderColor: activeTab === 'units' ? '#4A7B5B' : 'transparent',
            color: activeTab === 'units' ? '#4A7B5B' : '#94A3B8',
          }}
        >
          <Layers className="w-4 h-4" />
          <span>Organizational Units & Teams</span>
          <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-500">
            {units.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('positions')}
          className="flex items-center gap-1.5 py-3 px-2 text-xs font-extrabold border-b-2 transition-all"
          style={{
            borderColor: activeTab === 'positions' ? '#4A7B5B' : 'transparent',
            color: activeTab === 'positions' ? '#4A7B5B' : '#94A3B8',
          }}
        >
          <Building2 className="w-4 h-4" />
          <span>Positions & Posts</span>
        </button>

        <button
          onClick={() => setActiveTab('geography')}
          className="flex items-center gap-1.5 py-3 px-2 text-xs font-extrabold border-b-2 transition-all"
          style={{
            borderColor: activeTab === 'geography' ? '#4A7B5B' : 'transparent',
            color: activeTab === 'geography' ? '#4A7B5B' : '#94A3B8',
          }}
        >
          <MapPin className="w-4 h-4" />
          <span>Geographic Responsibility</span>
          <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-500">
            {geoAssignments.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className="flex items-center gap-1.5 py-3 px-2 text-xs font-extrabold border-b-2 transition-all"
          style={{
            borderColor: activeTab === 'audit' ? '#4A7B5B' : 'transparent',
            color: activeTab === 'audit' ? '#4A7B5B' : '#94A3B8',
          }}
        >
          <Clock className="w-4 h-4" />
          <span>Governance & Audit Trail</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-white border border-[#E2E8F0]" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={`Search ${activeTab}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm text-[#0F172A] placeholder-slate-400 focus:outline-none focus:border-[#4A7B5B] transition-colors"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {activeTab === 'units' && (
            <select
              value={selectedDepartmentFilter}
              onChange={(e) => setSelectedDepartmentFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm text-[#0F172A] focus:outline-none focus:border-[#4A7B5B]"
            >
              <option value="ALL">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          )}

          {activeTab === 'geography' && (
            <select
              value={selectedStateFilter}
              onChange={(e) => setSelectedStateFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm text-[#0F172A] focus:outline-none focus:border-[#4A7B5B]"
            >
              <option value="ALL">All States</option>
              {states.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.name}
                </option>
              ))}
            </select>
          )}

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm text-[#0F172A] focus:outline-none focus:border-[#4A7B5B]"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active Only</option>
            <option value="DISABLED">Disabled</option>
            <option value="ARCHIVED">Archived</option>
          </select>

          <button
            onClick={() => {
              if (activeTab === 'departments') refetchDepts();
              if (activeTab === 'units') refetchUnits();
              if (activeTab === 'geography') refetchGeo();
            }}
            className="p-2 rounded-xl bg-white hover:bg-gray-50 text-gray-600 border border-[#E2E8F0] transition-colors shadow-2xs"
            title="Refresh list"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: DEPARTMENTS */}
      {/* ========================================================================= */}
      {activeTab === 'departments' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-[#F1F5F9] overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm" style={{ color: '#0F172A' }}>
                <thead className="bg-slate-50/80 text-xs uppercase font-semibold tracking-wider border-b border-[#F1F5F9]" style={{ color: '#64748B' }}>
                  <tr>
                    <th className="px-6 py-4">Department</th>
                    <th className="px-6 py-4">Code / Slug</th>
                    <th className="px-6 py-4">Responsible Manager</th>
                    <th className="px-6 py-4">Parent Dept</th>
                    <th className="px-6 py-4 text-center">Units</th>
                    <th className="px-6 py-4 text-center">Total Members</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {isLoadingDepts ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                        Loading departments...
                      </td>
                    </tr>
                  ) : departments.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                        No departments found matching criteria
                      </td>
                    </tr>
                  ) : (
                    departments.map((dept) => (
                      <tr key={dept.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold" style={{ background: '#E8F3EC', color: '#4A7B5B' }}>
                              {dept.name.charAt(0)}
                            </div>
                            <div>
                              <span className="font-semibold group-hover:text-[#4A7B5B] transition-colors" style={{ color: '#0F172A' }}>
                                {dept.name}
                              </span>
                              {dept.description && (
                                <p className="text-xs text-slate-400 line-clamp-1 max-w-xs">{dept.description}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-mono text-xs px-2 py-1 rounded bg-slate-100 text-slate-600 border border-slate-200">
                            {dept.code || dept.slug}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {dept.manager ? (
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-[#E8F3EC] text-[#4A7B5B] flex items-center justify-center text-xs font-bold border border-[#4A7B5B]/20">
                                {dept.manager.fullName.charAt(0)}
                              </div>
                              <div>
                                <p className="text-xs font-medium" style={{ color: '#0F172A' }}>{dept.manager.fullName}</p>
                                <p className="text-[10px]" style={{ color: '#94A3B8' }}>{dept.manager.email}</p>
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-500 italic">Unassigned</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {dept.parentDepartment ? (
                            <span className="text-xs font-medium" style={{ color: '#4A7B5B' }}>
                              {dept.parentDepartment.name}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-500">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                            {dept.unitsCount || 0}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {dept.totalMembersCount || 0}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                              dept.status === 'ACTIVE'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : dept.status === 'DISABLED'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                dept.status === 'ACTIVE'
                                  ? 'bg-emerald-500'
                                  : dept.status === 'DISABLED'
                                  ? 'bg-amber-500'
                                  : 'bg-rose-500'
                              }`}
                            />
                            {dept.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setSelectedDeptDrawer(dept)}
                              className="p-1.5 rounded-lg bg-white hover:bg-[#E8F3EC] text-slate-500 hover:text-[#4A7B5B] transition-colors border border-slate-200 shadow-2xs"
                              title="View Details & Sub-structure"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setEditingDept(dept);
                                setIsDeptModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg bg-white hover:bg-[#4A7B5B] text-slate-500 hover:text-white transition-colors border border-slate-200 shadow-2xs"
                              title="Edit Department"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() =>
                                toggleDeptStatusMutation.mutate({
                                  id: dept.id,
                                  status: dept.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE',
                                })
                              }
                              className={`p-1.5 rounded-lg transition-colors border shadow-2xs ${
                                dept.status === 'ACTIVE'
                                  ? 'bg-white text-slate-500 border-slate-200 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300'
                                  : 'bg-white text-slate-500 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300'
                              }`}
                              title={dept.status === 'ACTIVE' ? 'Disable Department' : 'Enable Department'}
                            >
                              {dept.status === 'ACTIVE' ? (
                                <XCircle className="w-4 h-4" />
                              ) : (
                                <CheckCircle2 className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: ORGANIZATIONAL UNITS & TEAMS */}
      {/* ========================================================================= */}
      {activeTab === 'units' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-[#F1F5F9] overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm" style={{ color: '#0F172A' }}>
                <thead className="bg-slate-50/80 text-xs uppercase font-semibold tracking-wider border-b border-[#F1F5F9]" style={{ color: '#64748B' }}>
                  <tr>
                    <th className="px-6 py-4">Unit / Team Name</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4">Department</th>
                    <th className="px-6 py-4">Responsible Manager</th>
                    <th className="px-6 py-4">Parent Unit</th>
                    <th className="px-6 py-4 text-center">Active Members</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {isLoadingUnits ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                        Loading units and teams...
                      </td>
                    </tr>
                  ) : units.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                        No organizational units found
                      </td>
                    </tr>
                  ) : (
                    units.map((unit) => (
                      <tr key={unit.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold" style={{ background: '#E8F3EC', color: '#4A7B5B' }}>
                              <Layers className="w-4 h-4" />
                            </div>
                            <div>
                              <span className="font-semibold group-hover:text-[#4A7B5B] transition-colors" style={{ color: '#0F172A' }}>
                                {unit.name}
                              </span>
                              {unit.description && (
                                <p className="text-xs text-slate-400 line-clamp-1 max-w-xs">{unit.description}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-600">
                            {unit.unitType}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-medium" style={{ color: '#0F172A' }}>
                            {unit.department?.name || '—'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {unit.manager ? (
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-[#E8F3EC] text-[#4A7B5B] flex items-center justify-center text-xs font-bold border border-[#4A7B5B]/20">
                                {unit.manager.fullName.charAt(0)}
                              </div>
                              <div>
                                <p className="text-xs font-medium" style={{ color: '#0F172A' }}>{unit.manager.fullName}</p>
                                <p className="text-[10px]" style={{ color: '#94A3B8' }}>{unit.manager.email}</p>
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-500 italic">Unassigned</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {unit.parentTeam ? (
                            <span className="text-xs font-medium" style={{ color: '#4A7B5B' }}>
                              {unit.parentTeam.name}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-500">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {unit.membersCount || 0}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                              unit.status === 'ACTIVE'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                unit.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-400'
                              }`}
                            />
                            {unit.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setTargetUnitForMember(unit);
                                setIsAssignMemberModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg bg-white hover:bg-[#E8F3EC] text-slate-500 hover:text-[#4A7B5B] transition-colors border border-slate-200 shadow-2xs"
                              title="Assign User to Unit"
                            >
                              <UserPlus className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setSelectedUnitDrawer(unit)}
                              className="p-1.5 rounded-lg bg-white hover:bg-[#E8F3EC] text-slate-500 hover:text-[#4A7B5B] transition-colors border border-slate-200 shadow-2xs"
                              title="View Team Roster"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setEditingUnit(unit);
                                setIsUnitModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg bg-white hover:bg-[#4A7B5B] text-slate-500 hover:text-white transition-colors border border-slate-200 shadow-2xs"
                              title="Edit Unit"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: POSITIONS & POSTS */}
      {/* ========================================================================= */}
      {activeTab === 'positions' && (
        <PositionsTab departments={departments} states={states} />
      )}

      {/* ========================================================================= */}
      {/* TAB 4: GEOGRAPHIC RESPONSIBILITY */}
      {/* ========================================================================= */}
      {activeTab === 'geography' && (
        <div className="space-y-4">
          {/* Historical Safety Callout Banner */}
          <div className="p-4 rounded-xl border flex items-start gap-3" style={{ background: '#E8F3EC', borderColor: '#4A7B5B30' }}>
            <Info className="w-5 h-5 shrink-0 mt-0.5" style={{ color: '#4A7B5B' }} />
            <div className="text-xs" style={{ color: '#475569' }}>
              <span className="font-semibold" style={{ color: '#0F172A' }}>Historical Ownership Protection: </span>
              Reassigning a state or district creates an immutable new responsibility timeline and archives the
              previous assignment. Existing students, applications, and payments previously handled by Senior
              Counselor A remain historically assigned to A.
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#F1F5F9] overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm" style={{ color: '#0F172A' }}>
                <thead className="bg-slate-50/80 text-xs uppercase font-semibold tracking-wider border-b border-[#F1F5F9]" style={{ color: '#64748B' }}>
                  <tr>
                    <th className="px-6 py-4">State</th>
                    <th className="px-6 py-4">District / Territory</th>
                    <th className="px-6 py-4">Primary Senior Counselor</th>
                    <th className="px-6 py-4">Backup Counselor</th>
                    <th className="px-6 py-4">Effective Dates</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {isLoadingGeo ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                        Loading geographic assignments...
                      </td>
                    </tr>
                  ) : geoAssignments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                        No geographic responsibility mappings found. Click &quot;Assign Responsibility&quot; or &quot;Seed States & Districts&quot;.
                      </td>
                    </tr>
                  ) : (
                    geoAssignments.map((geo) => (
                      <tr key={geo.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Globe className="w-4 h-4" style={{ color: '#4A7B5B' }} />
                            <span className="font-semibold" style={{ color: '#0F172A' }}>{geo.state.name}</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200">
                              {geo.state.code}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {geo.district ? (
                            <span className="font-semibold text-[#0F172A]">{geo.district.name}</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-xs font-semibold" style={{ background: '#E8F3EC', color: '#4A7B5B', border: '1px solid #4A7B5B30' }}>
                              State-wide (All Districts)
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: '#E8F3EC', color: '#4A7B5B', border: '1px solid #4A7B5B30' }}>
                              {geo.responsibleUser.fullName.charAt(0)}
                            </div>
                            <div>
                              <p className="text-xs font-medium" style={{ color: '#0F172A' }}>
                                {geo.responsibleUser.fullName}
                              </p>
                              <p className="text-[10px] text-slate-400">{geo.responsibleUser.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {geo.backupUser ? (
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-[#E8F3EC] text-[#4A7B5B] flex items-center justify-center text-xs font-bold border border-[#4A7B5B]/20">
                                {geo.backupUser.fullName.charAt(0)}
                              </div>
                              <div>
                                <p className="text-xs font-medium" style={{ color: '#0F172A' }}>{geo.backupUser.fullName}</p>
                                <p className="text-[10px] text-slate-400">{geo.backupUser.email}</p>
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-500 italic">None</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-xs text-slate-400 flex flex-col gap-0.5">
                            <span>From: {new Date(geo.effectiveFrom).toLocaleDateString()}</span>
                            <span>
                              Until: {geo.effectiveUntil ? new Date(geo.effectiveUntil).toLocaleDateString() : 'Ongoing'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                              geo.status === 'ACTIVE'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                geo.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-400'
                              }`}
                            />
                            {geo.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() =>
                                setSelectedGeoHistory({
                                  stateId: geo.stateId,
                                  stateName: geo.state.name,
                                  districtId: geo.districtId || undefined,
                                  districtName: geo.district?.name,
                                })
                              }
                              className="p-1.5 rounded-lg bg-white hover:bg-[#E8F3EC] text-slate-500 hover:text-[#4A7B5B] transition-colors border border-slate-200 shadow-2xs"
                              title="View Reassignment Timeline"
                            >
                              <Clock className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setEditingGeoAssignment(geo);
                                setIsGeoModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg bg-white hover:bg-[#4A7B5B] text-slate-500 hover:text-white transition-colors border border-slate-200 shadow-2xs"
                              title="Reassign Responsible Counselor"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: GOVERNANCE & AUDIT TRAIL */}
      {/* ========================================================================= */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="p-6 rounded-2xl bg-white border border-[#F1F5F9]" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <h3 className="text-lg font-bold mb-2" style={{ color: '#0F172A' }}>Organizational Governance & Audit Trail</h3>
            <p className="text-sm mb-6" style={{ color: '#94A3B8' }}>
              Full enterprise audit trail of structural changes, department modifications, team membership
              transitions, and geographic reassignments.
            </p>

            <div className="space-y-3">
              {departments
                .flatMap((d) => d.auditLogs || [])
                .concat(units.flatMap((u) => u.auditLogs || []))
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .slice(0, 30)
                .map((log: any, idx: number) => (
                  <div
                    key={log.id || idx}
                    className="p-4 rounded-xl bg-slate-50 border border-[#F1F5F9] flex items-start justify-between gap-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg mt-0.5" style={{ background: '#E8F3EC', color: '#4A7B5B' }}>
                        <Clock className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 font-mono border border-slate-200" style={{ color: '#4A7B5B' }}>
                            {log.action}
                          </span>
                          <span className="text-sm font-medium" style={{ color: '#0F172A' }}>{log.description}</span>
                        </div>
                        <p className="text-xs mt-1" style={{ color: '#94A3B8' }}>
                          Entity: <span style={{ color: '#475569' }}>{log.entityName || log.entity}</span>
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs text-slate-500">{new Date(log.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CREATE / EDIT DEPARTMENT */}
      {/* ========================================================================= */}
      {isDeptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl bg-white border border-gray-100 p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#E8F3EC' }}>
                  <Building2 className="w-5 h-5" style={{ color: '#4A7B5B' }} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#0F172A]">
                    {editingDept ? 'Edit Department' : 'Create Department'}
                  </h2>
                  <p className="text-xs text-[#94A3B8]">Configure department hierarchy, code & scope</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDeptModalOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-gray-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const name = (formData.get('name') as string)?.trim();
                const code = (formData.get('code') as string)?.trim();
                const description = (formData.get('description') as string)?.trim();
                const parentDepartmentId = (formData.get('parentDepartmentId') as string) || null;
                const status = formData.get('status') as string;

                if (!name) return showToast('Department name is required', 'error');

                if (editingDept) {
                  updateDeptMutation.mutate({
                    id: editingDept.id,
                    data: { name, code, description, parentDepartmentId, status },
                  });
                } else {
                  createDeptMutation.mutate({
                    name,
                    code,
                    description,
                    parentDepartmentId: parentDepartmentId || undefined,
                    status,
                  });
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-[#0F172A] mb-1.5">
                  Department Name <span className="text-rose-500">*</span>
                </label>
                <input
                  name="name"
                  type="text"
                  required
                  defaultValue={editingDept?.name || ''}
                  placeholder="e.g. Counseling & Admissions, Finance, Technology"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E2E8F0] text-sm text-[#0F172A] placeholder-slate-400 focus:outline-none focus:border-[#4A7B5B] focus:ring-1 focus:ring-[#4A7B5B] transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#0F172A] mb-1.5">
                    Department Code
                  </label>
                  <input
                    name="code"
                    type="text"
                    defaultValue={editingDept?.code || ''}
                    placeholder="e.g. COUNSEL, FIN, ADM"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E2E8F0] text-sm text-[#0F172A] font-mono placeholder-slate-400 focus:outline-none focus:border-[#4A7B5B] focus:ring-1 focus:ring-[#4A7B5B] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0F172A] mb-1.5">
                    Parent Department
                  </label>
                  <select
                    name="parentDepartmentId"
                    defaultValue={editingDept?.parentDepartmentId || ''}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E2E8F0] text-sm text-[#0F172A] focus:outline-none focus:border-[#4A7B5B] focus:ring-1 focus:ring-[#4A7B5B] transition-all"
                  >
                    <option value="">None (Top-level)</option>
                    {departments
                      .filter((d) => d.id !== editingDept?.id)
                      .map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0F172A] mb-1.5">
                  Description
                </label>
                <textarea
                  name="description"
                  rows={3}
                  defaultValue={editingDept?.description || ''}
                  placeholder="Operational scope and responsibility summary..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E2E8F0] text-sm text-[#0F172A] placeholder-slate-400 focus:outline-none focus:border-[#4A7B5B] focus:ring-1 focus:ring-[#4A7B5B] transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0F172A] mb-1.5">
                  Status
                </label>
                <select
                  name="status"
                  defaultValue={editingDept?.status || 'ACTIVE'}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E2E8F0] text-sm text-[#0F172A] focus:outline-none focus:border-[#4A7B5B] focus:ring-1 focus:ring-[#4A7B5B] transition-all"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="DISABLED">DISABLED</option>
                  <option value="ARCHIVED">ARCHIVED</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#F1F5F9]">
                <button
                  type="button"
                  onClick={() => setIsDeptModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-[#334155] border border-[#E2E8F0] text-sm font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createDeptMutation.isPending || updateDeptMutation.isPending}
                  className="px-5 py-2 rounded-xl text-white text-sm font-semibold transition-all shadow-sm disabled:opacity-50 flex items-center gap-2"
                  style={{ background: '#4A7B5B' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#3B664A')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '#4A7B5B')}
                >
                  {createDeptMutation.isPending || updateDeptMutation.isPending
                    ? 'Saving...'
                    : editingDept
                    ? 'Update Department'
                    : 'Create Department'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CREATE / EDIT ORGANIZATIONAL UNIT */}
      {/* ========================================================================= */}
      {isUnitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl bg-white border border-gray-100 p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#E8F3EC' }}>
                  <Layers className="w-5 h-5" style={{ color: '#4A7B5B' }} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#0F172A]">
                    {editingUnit ? 'Edit Organizational Unit' : 'Create Unit / Team'}
                  </h2>
                  <p className="text-xs text-[#94A3B8]">Define unit structure, type and reporting parent</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsUnitModalOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-gray-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const name = (formData.get('name') as string)?.trim();
                const departmentId = formData.get('departmentId') as string;
                const unitType = formData.get('unitType') as string;
                const code = (formData.get('code') as string)?.trim();
                const description = (formData.get('description') as string)?.trim();
                const parentTeamId = (formData.get('parentTeamId') as string) || null;
                const status = formData.get('status') as string;

                if (!name || !departmentId) {
                  return showToast('Unit name and department are required', 'error');
                }

                if (editingUnit) {
                  updateUnitMutation.mutate({
                    id: editingUnit.id,
                    data: { name, unitType, code, description, parentTeamId, status },
                  });
                } else {
                  createUnitMutation.mutate({
                    name,
                    departmentId,
                    unitType,
                    code,
                    description,
                    parentTeamId: parentTeamId || undefined,
                    status,
                  });
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-[#0F172A] mb-1.5">
                  Unit / Team Name <span className="text-rose-500">*</span>
                </label>
                <input
                  name="name"
                  type="text"
                  required
                  defaultValue={editingUnit?.name || ''}
                  placeholder="e.g. Lead Ingestion Unit, Verification Squad Alpha"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E2E8F0] text-sm text-[#0F172A] placeholder-slate-400 focus:outline-none focus:border-[#4A7B5B] focus:ring-1 focus:ring-[#4A7B5B] transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#0F172A] mb-1.5">
                    Department <span className="text-rose-500">*</span>
                  </label>
                  <select
                    name="departmentId"
                    required
                    disabled={!!editingUnit}
                    defaultValue={editingUnit?.departmentId || departments[0]?.id || ''}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E2E8F0] text-sm text-[#0F172A] focus:outline-none focus:border-[#4A7B5B] focus:ring-1 focus:ring-[#4A7B5B] disabled:bg-slate-100 disabled:text-slate-500 transition-all"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0F172A] mb-1.5">
                    Unit Type
                  </label>
                  <select
                    name="unitType"
                    defaultValue={editingUnit?.unitType || 'UNIT'}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E2E8F0] text-sm text-[#0F172A] focus:outline-none focus:border-[#4A7B5B] focus:ring-1 focus:ring-[#4A7B5B] transition-all"
                  >
                    <option value="UNIT">UNIT</option>
                    <option value="TEAM">TEAM</option>
                    <option value="DIVISION">DIVISION</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0F172A] mb-1.5">
                  Parent Unit (Optional Hierarchy)
                </label>
                <select
                  name="parentTeamId"
                  defaultValue={editingUnit?.parentTeamId || ''}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E2E8F0] text-sm text-[#0F172A] focus:outline-none focus:border-[#4A7B5B] focus:ring-1 focus:ring-[#4A7B5B] transition-all"
                >
                  <option value="">None (Top unit in department)</option>
                  {units
                    .filter((u) => u.id !== editingUnit?.id)
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.department?.name})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0F172A] mb-1.5">
                  Description
                </label>
                <textarea
                  name="description"
                  rows={2}
                  defaultValue={editingUnit?.description || ''}
                  placeholder="Functional duties..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E2E8F0] text-sm text-[#0F172A] placeholder-slate-400 focus:outline-none focus:border-[#4A7B5B] focus:ring-1 focus:ring-[#4A7B5B] transition-all resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#F1F5F9]">
                <button
                  type="button"
                  onClick={() => setIsUnitModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-[#334155] border border-[#E2E8F0] text-sm font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createUnitMutation.isPending || updateUnitMutation.isPending}
                  className="px-5 py-2 rounded-xl text-white text-sm font-semibold transition-all shadow-sm disabled:opacity-50 flex items-center gap-2"
                  style={{ background: '#4A7B5B' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#3B664A')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '#4A7B5B')}
                >
                  {createUnitMutation.isPending || updateUnitMutation.isPending
                    ? 'Saving...'
                    : editingUnit
                    ? 'Update Unit'
                    : 'Create Unit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ASSIGN USER TO UNIT */}
      {/* ========================================================================= */}
      {isAssignMemberModalOpen && targetUnitForMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-white border border-gray-100 p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#E8F3EC' }}>
                  <UserPlus className="w-5 h-5" style={{ color: '#4A7B5B' }} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#0F172A]">Assign Member</h2>
                  <p className="text-xs text-[#94A3B8]">Unit: {targetUnitForMember.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAssignMemberModalOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-gray-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Crucial Enterprise Architecture Reminder */}
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
              <span className="font-bold text-amber-950">Concept Distinction: </span>
              Unit membership places the user in this operational team. It does NOT grant IAM permissions. IAM
              permissions are controlled strictly by dynamic Roles.
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const userId = (formData.get('userId') as string)?.trim();
                const memberRole = formData.get('memberRole') as string;
                const isPrimary = formData.get('isPrimary') === 'true';

                if (!userId) return showToast('User ID is required', 'error');

                assignMemberMutation.mutate({
                  unitId: targetUnitForMember.id,
                  data: { userId, memberRole, isPrimary },
                });
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-[#0F172A] mb-1.5">
                  User ID / Counselor ID <span className="text-rose-500">*</span>
                </label>
                <input
                  name="userId"
                  type="text"
                  required
                  placeholder="Paste User UUID"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E2E8F0] text-sm text-[#0F172A] font-mono placeholder-slate-400 focus:outline-none focus:border-[#4A7B5B] focus:ring-1 focus:ring-[#4A7B5B] transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#0F172A] mb-1.5">
                    Member Role
                  </label>
                  <select
                    name="memberRole"
                    defaultValue="MEMBER"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E2E8F0] text-sm text-[#0F172A] focus:outline-none focus:border-[#4A7B5B] focus:ring-1 focus:ring-[#4A7B5B] transition-all"
                  >
                    <option value="MEMBER">MEMBER</option>
                    <option value="LEAD">LEAD</option>
                    <option value="OPERATOR">OPERATOR</option>
                    <option value="VERIFIER">VERIFIER</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0F172A] mb-1.5">
                    Primary Team?
                  </label>
                  <select
                    name="isPrimary"
                    defaultValue="true"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E2E8F0] text-sm text-[#0F172A] focus:outline-none focus:border-[#4A7B5B] focus:ring-1 focus:ring-[#4A7B5B] transition-all"
                  >
                    <option value="true">Yes (Primary Unit)</option>
                    <option value="false">No (Secondary)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#F1F5F9]">
                <button
                  type="button"
                  onClick={() => setIsAssignMemberModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-[#334155] border border-[#E2E8F0] text-sm font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assignMemberMutation.isPending}
                  className="px-5 py-2 rounded-xl text-white text-sm font-semibold transition-all shadow-sm disabled:opacity-50 flex items-center gap-2"
                  style={{ background: '#4A7B5B' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#3B664A')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '#4A7B5B')}
                >
                  {assignMemberMutation.isPending ? 'Assigning...' : 'Assign to Unit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ASSIGN / REASSIGN GEOGRAPHIC RESPONSIBILITY */}
      {/* ========================================================================= */}
      {isGeoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl bg-white border border-gray-100 p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#E8F3EC' }}>
                  <MapPin className="w-5 h-5" style={{ color: '#4A7B5B' }} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#0F172A]">
                    {editingGeoAssignment ? 'Reassign Geographic Responsibility' : 'Assign Geographic Responsibility'}
                  </h2>
                  <p className="text-xs text-[#94A3B8]">
                    State & District Senior Counselor Mapping
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsGeoModalOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-gray-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const stateId = formData.get('stateId') as string;
                const districtId = (formData.get('districtId') as string) || null;
                const responsibleUserId = (formData.get('responsibleUserId') as string)?.trim();
                const backupUserId = (formData.get('backupUserId') as string)?.trim() || null;
                const notes = (formData.get('notes') as string)?.trim();

                if (!stateId || !responsibleUserId) {
                  return showToast('State and Primary Responsible Counselor are required', 'error');
                }

                if (editingGeoAssignment) {
                  updateGeoMutation.mutate({
                    id: editingGeoAssignment.id,
                    data: { responsibleUserId, backupUserId, notes },
                  });
                } else {
                  createGeoMutation.mutate({
                    stateId,
                    districtId: districtId || null,
                    responsibleUserId,
                    backupUserId,
                    notes,
                  });
                }
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#0F172A] mb-1.5">
                    State <span className="text-rose-500">*</span>
                  </label>
                  <select
                    name="stateId"
                    required
                    disabled={!!editingGeoAssignment}
                    defaultValue={editingGeoAssignment?.stateId || states[0]?.id || ''}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E2E8F0] text-sm text-[#0F172A] focus:outline-none focus:border-[#4A7B5B] focus:ring-1 focus:ring-[#4A7B5B] disabled:bg-slate-100 disabled:text-slate-500 transition-all"
                  >
                    {states.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name} ({st.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0F172A] mb-1.5">
                    District (Optional)
                  </label>
                  <input
                    name="districtId"
                    type="text"
                    disabled={!!editingGeoAssignment}
                    defaultValue={editingGeoAssignment?.districtId || ''}
                    placeholder="Leave empty for State-wide"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E2E8F0] text-sm text-[#0F172A] placeholder-slate-400 focus:outline-none focus:border-[#4A7B5B] focus:ring-1 focus:ring-[#4A7B5B] disabled:bg-slate-100 disabled:text-slate-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0F172A] mb-1.5">
                  Primary Responsible Senior Counselor (User ID) <span className="text-rose-500">*</span>
                </label>
                <input
                  name="responsibleUserId"
                  type="text"
                  required
                  defaultValue={editingGeoAssignment?.responsibleUserId || ''}
                  placeholder="Paste Senior Counselor UUID"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E2E8F0] text-sm text-[#0F172A] font-mono placeholder-slate-400 focus:outline-none focus:border-[#4A7B5B] focus:ring-1 focus:ring-[#4A7B5B] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0F172A] mb-1.5">
                  Backup Responsible Counselor (User ID)
                </label>
                <input
                  name="backupUserId"
                  type="text"
                  defaultValue={editingGeoAssignment?.backupUserId || ''}
                  placeholder="Optional Backup Counselor UUID"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E2E8F0] text-sm text-[#0F172A] font-mono placeholder-slate-400 focus:outline-none focus:border-[#4A7B5B] focus:ring-1 focus:ring-[#4A7B5B] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0F172A] mb-1.5">
                  Notes / Handover Reason
                </label>
                <textarea
                  name="notes"
                  rows={2}
                  defaultValue={editingGeoAssignment?.notes || ''}
                  placeholder="Operational notes..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E2E8F0] text-sm text-[#0F172A] placeholder-slate-400 focus:outline-none focus:border-[#4A7B5B] focus:ring-1 focus:ring-[#4A7B5B] transition-all resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#F1F5F9]">
                <button
                  type="button"
                  onClick={() => setIsGeoModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-[#334155] border border-[#E2E8F0] text-sm font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createGeoMutation.isPending || updateGeoMutation.isPending}
                  className="px-5 py-2 rounded-xl text-white text-sm font-semibold transition-all shadow-sm disabled:opacity-50 flex items-center gap-2"
                  style={{ background: '#4A7B5B' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#3B664A')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '#4A7B5B')}
                >
                  {createGeoMutation.isPending || updateGeoMutation.isPending
                    ? 'Saving...'
                    : editingGeoAssignment
                    ? 'Reassign Counselor'
                    : 'Save Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DRAWER: UNIT / TEAM ROSTER & DETAILS */}
      {/* ========================================================================= */}
      {selectedUnitDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-xl h-full bg-white border-l border-[#E2E8F0] p-6 overflow-y-auto space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#E8F3EC', border: '1px solid #4A7B5B30' }}>
                  <Layers className="w-5 h-5" style={{ color: '#4A7B5B' }} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[#0F172A]">{selectedUnitDrawer.name}</h2>
                  <p className="text-xs text-[#64748B]">
                    {selectedUnitDrawer.department?.name} • {selectedUnitDrawer.unitType}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedUnitDrawer(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-[#0F172A] hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setTargetUnitForMember(selectedUnitDrawer);
                  setIsAssignMemberModalOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-xs font-semibold transition-all shadow-2xs"
                style={{ background: '#4A7B5B' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#3B664A')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#4A7B5B')}
              >
                <UserPlus className="w-4 h-4" />
                <span>Add Member to Unit</span>
              </button>
            </div>

            {/* Team Members Roster */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                  Active Team Members ({singleUnitDetail?.members?.length || 0})
                </h3>
              </div>

              {isLoadingSingleUnit ? (
                <div className="p-8 text-center text-sm text-slate-400">Loading team members...</div>
              ) : !singleUnitDetail?.members?.length ? (
                <div className="p-8 text-center text-sm text-[#94A3B8] rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                  No members assigned to this unit yet
                </div>
              ) : (
                <div className="divide-y divide-[#F1F5F9] border border-[#E2E8F0] rounded-xl overflow-hidden bg-white shadow-2xs">
                  {singleUnitDetail.members.map((m: any) => (
                    <div key={m.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full font-bold text-xs flex items-center justify-center" style={{ background: '#E8F3EC', color: '#4A7B5B', border: '1px solid #4A7B5B30' }}>
                          {m.user?.fullName?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-[#0F172A]">{m.user?.fullName}</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                              {m.memberRole}
                            </span>
                            {m.isPrimary && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                                PRIMARY
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[#64748B]">{m.user?.email}</p>
                        </div>
                      </div>

                      <button
                        onClick={() =>
                          removeMemberMutation.mutate({
                            unitId: selectedUnitDrawer.id,
                            userId: m.user.id,
                          })
                        }
                        className="p-1.5 rounded-lg bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 transition-colors shadow-2xs"
                        title="Remove Member"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Represented Roles in this Unit */}
            {singleUnitDetail?.representedRoles && singleUnitDetail.representedRoles.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                  IAM Roles Active in this Unit
                </h3>
                <div className="flex flex-wrap gap-2">
                  {singleUnitDetail.representedRoles.map((role: any) => (
                    <span
                      key={role.id}
                      className="px-3 py-1 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs font-medium text-slate-700 shadow-2xs"
                    >
                      {role.name} ({role.dataScope})
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DRAWER: DEPARTMENT DETAILS & SUB-STRUCTURE */}
      {/* ========================================================================= */}
      {selectedDeptDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-xl h-full bg-white border-l border-[#E2E8F0] p-6 overflow-y-auto space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold" style={{ background: '#E8F3EC', color: '#4A7B5B', border: '1px solid #4A7B5B30' }}>
                  {selectedDeptDrawer.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-[#0F172A]">{selectedDeptDrawer.name}</h2>
                    {selectedDeptDrawer.code && (
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                        {selectedDeptDrawer.code}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#64748B]">Department Details & Sub-structure</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDeptDrawer(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-[#0F172A] hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setEditingDept(selectedDeptDrawer);
                  setIsDeptModalOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-xs font-semibold transition-all shadow-2xs"
                style={{ background: '#4A7B5B' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#3B664A')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#4A7B5B')}
              >
                <Edit className="w-4 h-4" />
                <span>Edit Department</span>
              </button>
            </div>

            {/* Department Summary Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                <span className="text-xs text-[#64748B] block">Units / Teams</span>
                <span className="text-lg font-bold text-[#0F172A] mt-1 block">
                  {singleDeptDetail?.teams?.length || selectedDeptDrawer.unitsCount || 0}
                </span>
              </div>
              <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                <span className="text-xs text-[#64748B] block">Total Members</span>
                <span className="text-lg font-bold text-emerald-700 mt-1 block">
                  {selectedDeptDrawer.totalMembersCount || 0}
                </span>
              </div>
            </div>

            {/* Responsible Manager */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">Responsible Manager</h3>
              {selectedDeptDrawer.manager ? (
                <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full font-bold text-xs flex items-center justify-center" style={{ background: '#E8F3EC', color: '#4A7B5B', border: '1px solid #4A7B5B30' }}>
                    {selectedDeptDrawer.manager.fullName.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#0F172A]">{selectedDeptDrawer.manager.fullName}</p>
                    <p className="text-xs text-[#64748B]">{selectedDeptDrawer.manager.email}</p>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-slate-500 italic">
                  No manager currently assigned to this department
                </div>
              )}
            </div>

            {/* Units under this department */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                Organizational Units in this Department ({units.filter((u) => u.departmentId === selectedDeptDrawer.id).length})
              </h3>
              {isLoadingSingleDept ? (
                <div className="p-8 text-center text-sm text-slate-400">Loading department details...</div>
              ) : units.filter((u) => u.departmentId === selectedDeptDrawer.id).length === 0 ? (
                <div className="p-8 text-center text-sm text-[#94A3B8] rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                  No organizational units under this department yet
                </div>
              ) : (
                <div className="divide-y divide-[#F1F5F9] border border-[#E2E8F0] rounded-xl overflow-hidden bg-white shadow-2xs">
                  {units
                    .filter((u) => u.departmentId === selectedDeptDrawer.id)
                    .map((unit) => (
                      <div key={unit.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs" style={{ background: '#E8F3EC', color: '#4A7B5B' }}>
                            <Layers className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-sm font-bold text-[#0F172A]">{unit.name}</span>
                            <p className="text-xs text-[#64748B]">{unit.unitType} • {unit.membersCount || 0} Members</p>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedDeptDrawer(null);
                            setSelectedUnitDrawer(unit);
                          }}
                          className="p-1.5 rounded-lg bg-white hover:bg-[#E8F3EC] text-slate-500 hover:text-[#4A7B5B] border border-slate-200 transition-colors shadow-2xs"
                          title="View Unit Roster"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DRAWER: GEOGRAPHIC TIMELINE & REASSIGNMENT HISTORY */}
      {/* ========================================================================= */}
      {selectedGeoHistory && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg h-full bg-white border-l border-[#E2E8F0] p-6 overflow-y-auto space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#E8F3EC', border: '1px solid #4A7B5B30' }}>
                  <Clock className="w-5 h-5" style={{ color: '#4A7B5B' }} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[#0F172A]">
                    {selectedGeoHistory.districtName || selectedGeoHistory.stateName}
                  </h2>
                  <p className="text-xs text-[#64748B]">Geographic Responsibility Timeline</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedGeoHistory(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-[#0F172A] hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {isLoadingGeoHistory ? (
                <div className="p-8 text-center text-sm text-slate-400">Loading timeline...</div>
              ) : !geoHistoryData?.assignments?.length ? (
                <div className="p-8 text-center text-sm text-[#94A3B8] rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                  No assignment history found
                </div>
              ) : (
                geoHistoryData.assignments.map((as: any) => (
                  <div
                    key={as.id}
                    className={`p-4 rounded-xl border relative pl-6 ${
                      as.status === 'ACTIVE'
                        ? 'bg-emerald-50/60 border-emerald-200'
                        : 'bg-[#F8FAFC] border-[#E2E8F0]'
                    }`}
                  >
                    <div
                      className={`absolute left-2.5 top-5 w-2.5 h-2.5 rounded-full ${
                        as.status === 'ACTIVE' ? 'bg-[#4A7B5B] ring-4 ring-emerald-100' : 'bg-slate-400'
                      }`}
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-[#0F172A]">
                        {as.responsibleUser?.fullName}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                          as.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {as.status}
                      </span>
                    </div>
                    <p className="text-xs text-[#64748B] mt-1">{as.responsibleUser?.email}</p>
                    <div className="mt-2 text-xs text-[#64748B] flex items-center gap-3">
                      <span>From: {new Date(as.effectiveFrom).toLocaleDateString()}</span>
                      <span>
                        Until: {as.effectiveUntil ? new Date(as.effectiveUntil).toLocaleDateString() : 'Present'}
                      </span>
                    </div>
                    {as.backupUser && (
                      <p className="text-xs text-[#64748B] mt-1">Backup: <strong className="text-[#0F172A]">{as.backupUser.fullName}</strong></p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

