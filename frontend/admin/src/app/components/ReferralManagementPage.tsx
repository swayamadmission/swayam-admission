import React, { useState, useEffect } from 'react';
import {
  Gift,
  Search,
  Filter,
  RefreshCw,
  TrendingUp,
  Award,
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ShieldAlert,
  ChevronRight,
  Eye,
  Check,
  X,
  DollarSign,
  Send,
  AlertCircle,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  Building,
  GraduationCap,
  Sliders,
  Play,
  Settings,
  Plus,
  Download,
  RotateCcw,
} from 'lucide-react';
import {
  referralsApi,
  AdminReferralItem,
  AdminReferralStats,
  AdminReferralFunnelItem,
  ReferralPolicy,
  PolicySimulationResult,
} from '../../api/referrals.api';

type TabKey =
  | 'all'
  | 'pending'
  | 'converted'
  | 'qualifying'
  | 'pending_approval'
  | 'approved'
  | 'paid'
  | 'flagged'
  | 'policy';

export const ReferralManagementPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [stats, setStats] = useState<AdminReferralStats | null>(null);
  const [funnel, setFunnel] = useState<AdminReferralFunnelItem[]>([]);
  const [referrals, setReferrals] = useState<AdminReferralItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Policy & Simulator State
  const [policies, setPolicies] = useState<ReferralPolicy[]>([]);
  const [activePolicy, setActivePolicy] = useState<ReferralPolicy | null>(null);
  const [simTotalReferrals, setSimTotalReferrals] = useState<number>(8);
  const [simQualifyingReferrals, setSimQualifyingReferrals] = useState<number>(5);
  const [simulationResult, setSimulationResult] = useState<PolicySimulationResult | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simError, setSimError] = useState<string | null>(null);

  // Create Policy Modal
  const [showCreatePolicyModal, setShowCreatePolicyModal] = useState(false);
  const [newPolicyVersion, setNewPolicyVersion] = useState('v1.1');
  const [newPolicyName, setNewPolicyName] = useState('Swayam Ambassador Referral Policy');
  const [newPolicyDesc, setNewPolicyDesc] = useState('Tier 1: 4/3 => ₹4,000. Tier 2: 8/6 => ₹10,000.');
  const [newPolicySettlement, setNewPolicySettlement] = useState('DIFFERENTIAL_UPGRADE');
  const [newT1Refs, setNewT1Refs] = useState(4);
  const [newT1Qual, setNewT1Qual] = useState(3);
  const [newT1Reward, setNewT1Reward] = useState(4000);
  const [newT2Refs, setNewT2Refs] = useState(8);
  const [newT2Qual, setNewT2Qual] = useState(6);
  const [newT2Reward, setNewT2Reward] = useState(10000);
  const [newPolicyActive, setNewPolicyActive] = useState(true);
  const [policyActionLoading, setPolicyActionLoading] = useState(false);

  // Inspector Drawer State
  const [selectedReferral, setSelectedReferral] = useState<AdminReferralItem | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Action Modals
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideCode, setOverrideCode] = useState('');
  const [overrideReason, setOverrideReason] = useState('');

  const [showFraudModal, setShowFraudModal] = useState(false);
  const [fraudDecision, setFraudDecision] = useState<'APPROVED' | 'REJECTED' | 'FLAGGED_FOR_REVIEW'>('FLAGGED_FOR_REVIEW');
  const [fraudReason, setFraudReason] = useState('');

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectRewardId, setRejectRewardId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutMethod, setPayoutMethod] = useState<'BANK_TRANSFER' | 'UPI' | 'WALLET' | 'FEE_CREDIT'>('UPI');
  const [payoutRef, setPayoutRef] = useState('');

  const fetchOverview = async () => {
    try {
      const [statsRes, funnelRes, policiesRes, activePolicyRes] = await Promise.all([
        referralsApi.getStats(),
        referralsApi.getFunnel(),
        referralsApi.getPolicies(),
        referralsApi.getActivePolicy(),
      ]);
      setStats(statsRes);
      setFunnel(funnelRes.funnel || []);
      setPolicies(policiesRes);
      setActivePolicy(activePolicyRes);
    } catch (err: any) {
      console.warn('Failed to load referral overview:', err);
    }
  };

  const fetchReferrals = async () => {
    if (activeTab === 'policy') return;
    try {
      setLoading(true);
      setError(null);

      const params: any = { page, limit: 15, search: search.trim() || undefined };

      if (activeTab === 'pending') params.status = 'LEAD_CREATED';
      if (activeTab === 'converted') params.status = 'ENROLLED';
      if (activeTab === 'qualifying') params.status = 'ENROLLED';
      if (activeTab === 'pending_approval') params.rewardStatus = 'PENDING_APPROVAL';
      if (activeTab === 'approved') params.rewardStatus = 'APPROVED';
      if (activeTab === 'paid') params.rewardStatus = 'PAID';
      if (activeTab === 'flagged') params.fraudStatus = 'FLAGGED_FOR_REVIEW';

      const res: any = await referralsApi.getReferrals(params);
      const items = Array.isArray(res) ? res : (res?.data || []);
      const total = typeof res?.total === 'number' ? res.total : items.length;
      const pages = res?.totalPages || Math.ceil(total / 15) || 1;

      setReferrals(items);
      setTotalPages(pages);
      setTotalCount(total);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch referral queue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  useEffect(() => {
    fetchReferrals();
  }, [activeTab, page, search]);

  const handleRunSimulation = async (customRefs?: number, customQual?: number) => {
    const refs = customRefs !== undefined ? customRefs : Number(simTotalReferrals);
    const qual = customQual !== undefined ? customQual : Number(simQualifyingReferrals);

    if (isNaN(refs) || refs < 0) {
      setSimError('Total referrals must be a non-negative number.');
      return;
    }
    if (isNaN(qual) || qual < 0) {
      setSimError('Qualifying referrals must be a non-negative number.');
      return;
    }
    if (qual > refs) {
      setSimError('Qualifying students cannot exceed total referrals.');
      return;
    }

    try {
      setIsSimulating(true);
      setSimError(null);
      const res = await referralsApi.simulatePolicy({
        totalReferrals: refs,
        qualifyingReferrals: qual,
        policyVersion: activePolicy?.version,
      });
      setSimulationResult(res);
    } catch (err: any) {
      setSimError(err.response?.data?.message || 'Simulation request failed.');
    } finally {
      setIsSimulating(false);
    }
  };

  const handleCreatePolicy = async () => {
    if (!newPolicyVersion.trim() || !newPolicyName.trim()) {
      alert('Policy version and name are required.');
      return;
    }
    try {
      setPolicyActionLoading(true);
      await referralsApi.createPolicy({
        version: newPolicyVersion.trim(),
        name: newPolicyName.trim(),
        description: newPolicyDesc.trim(),
        settlementMode: newPolicySettlement,
        tiers: [
          {
            id: 'tier-1',
            name: 'Tier 1',
            minReferrals: Number(newT1Refs),
            minQualifyingReferrals: Number(newT1Qual),
            rewardAmount: Number(newT1Reward),
            rewardType: 'CASH',
          },
          {
            id: 'tier-2',
            name: 'Tier 2',
            minReferrals: Number(newT2Refs),
            minQualifyingReferrals: Number(newT2Qual),
            rewardAmount: Number(newT2Reward),
            rewardType: 'CASH',
          },
        ],
        isActive: newPolicyActive,
      });
      setShowCreatePolicyModal(false);
      await fetchOverview();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create policy.');
    } finally {
      setPolicyActionLoading(false);
    }
  };

  const handleActivatePolicy = async (policyId: string) => {
    try {
      setPolicyActionLoading(true);
      await referralsApi.activatePolicy(policyId);
      await fetchOverview();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to activate policy.');
    } finally {
      setPolicyActionLoading(false);
    }
  };

  const handleUpdateQualification = async (isYearCompleted: boolean, isFeePaid: boolean) => {
    if (!selectedReferral) return;
    try {
      setDrawerLoading(true);
      setActionError(null);
      await referralsApi.updateQualification(selectedReferral.id, {
        isOneYearCompleted: isYearCompleted,
        isOneYearFeePaid: isFeePaid,
      });
      setActionSuccess('Qualification updated successfully. Referrer tier re-evaluated.');
      await fetchReferrals();
      await fetchOverview();
      const updated = referrals.find((r) => r.id === selectedReferral.id);
      if (updated) setSelectedReferral(updated);
    } catch (err: any) {
      setActionError(err.response?.data?.message || 'Failed to update qualification.');
    } finally {
      setDrawerLoading(false);
    }
  };

  const handleApproveReward = async (rewardId: string) => {
    try {
      setDrawerLoading(true);
      setActionError(null);
      await referralsApi.approveReward(rewardId, 'Approved via Admin Governance Desk');
      setActionSuccess('Referral reward successfully APPROVED for finance payout.');
      await fetchReferrals();
      await fetchOverview();
    } catch (err: any) {
      setActionError(err.response?.data?.message || 'Failed to approve reward.');
    } finally {
      setDrawerLoading(false);
    }
  };

  const handleRejectReward = async () => {
    if (!rejectRewardId || !rejectReason.trim()) {
      alert('Rejection reason is required.');
      return;
    }
    try {
      setDrawerLoading(true);
      setActionError(null);
      await referralsApi.rejectReward(rejectRewardId, rejectReason.trim());
      setActionSuccess('Referral reward REJECTED.');
      setShowRejectModal(false);
      setRejectReason('');
      await fetchReferrals();
      await fetchOverview();
    } catch (err: any) {
      setActionError(err.response?.data?.message || 'Failed to reject reward.');
    } finally {
      setDrawerLoading(false);
    }
  };

  const handleProcessPayout = async () => {
    if (!selectedReferral?.rewards?.[0]?.id || !payoutRef.trim()) {
      setActionError('Payout reference / UTR is required.');
      return;
    }

    try {
      setDrawerLoading(true);
      setActionError(null);
      await referralsApi.payoutReward(selectedReferral.rewards[0].id, payoutMethod, payoutRef.trim());
      setActionSuccess(`Payout confirmed via ${payoutMethod} (Ref: ${payoutRef.trim()}).`);
      setShowPayoutModal(false);
      setPayoutRef('');
      await fetchReferrals();
      await fetchOverview();
    } catch (err: any) {
      setActionError(err.response?.data?.message || 'Failed to complete payout.');
    } finally {
      setDrawerLoading(false);
    }
  };

  const handleOverrideAttribution = async () => {
    if (!selectedReferral || !overrideCode.trim() || !overrideReason.trim()) {
      alert('Both referral code and reason are required.');
      return;
    }
    try {
      setDrawerLoading(true);
      setActionError(null);
      await referralsApi.overrideAttribution(selectedReferral.id, overrideCode.trim(), overrideReason.trim());
      setActionSuccess('Attribution successfully transferred.');
      setShowOverrideModal(false);
      setOverrideCode('');
      setOverrideReason('');
      await fetchReferrals();
      await fetchOverview();
    } catch (err: any) {
      setActionError(err.response?.data?.message || 'Failed to override attribution.');
    } finally {
      setDrawerLoading(false);
    }
  };

  const handleFraudReview = async () => {
    if (!selectedReferral) return;
    try {
      setDrawerLoading(true);
      setActionError(null);
      await referralsApi.reviewFraud(selectedReferral.id, fraudDecision, fraudReason.trim());
      setActionSuccess(`Fraud decision committed: ${fraudDecision}`);
      setShowFraudModal(false);
      setFraudReason('');
      await fetchReferrals();
      await fetchOverview();
    } catch (err: any) {
      setActionError(err.response?.data?.message || 'Failed to update fraud status.');
    } finally {
      setDrawerLoading(false);
    }
  };

  const handleExportCsv = () => {
    if (referrals.length === 0) {
      alert('No referral records to export.');
      return;
    }
    const headers = [
      'Candidate Name',
      'Mobile',
      'Email',
      'Referral Code',
      'Referrer Name',
      'Referrer Email',
      'Status',
      '1-Yr Done',
      '1-Yr Fee Paid',
      'Is Qualifying',
      'Reward Status',
      'Created At',
    ];
    const rows = referrals.map((r) => [
      `"${r.referredName || ''}"`,
      `"${r.referredMobile || ''}"`,
      `"${r.referredEmail || ''}"`,
      `"${r.referralCode || ''}"`,
      `"${r.referrerStudent?.fullName || ''}"`,
      `"${r.referrerStudent?.email || ''}"`,
      `"${r.status || ''}"`,
      r.isOneYearCompleted ? 'YES' : 'NO',
      r.isOneYearFeePaid ? 'YES' : 'NO',
      r.isQualifying ? 'YES' : 'NO',
      `"${r.rewardStatus || ''}"`,
      `"${new Date(r.createdAt).toLocaleDateString()}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `swayam_referrals_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-[#4A7B5B] to-[#1E293B] p-6 rounded-3xl text-white shadow-sm border border-white/10">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#4A7B5B]/30 text-[#E8F3EC] border border-[#4A7B5B]/40 text-xs font-semibold mb-2">
            <Gift className="w-3.5 h-3.5 text-[#F0AE1A]" />
            Referral Reward & Policy Engine ({activePolicy?.version || 'v1.0'})
          </div>
          <h1 className="text-2xl font-black text-white">Student Referrals & Rewards Governance</h1>
          <p className="text-xs text-slate-300 mt-1">
            Authoritative 4/3 (Tier 1: ₹4,000) & 8/6 (Tier 2: ₹10,000) rules, dynamic versioned policy governance & finance payouts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab(activeTab === 'policy' ? 'all' : 'policy')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'policy' ? 'bg-[#F0AE1A] text-slate-900 shadow-md' : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            Policy Manager & Simulator
          </button>
          <button
            onClick={() => {
              fetchOverview();
              fetchReferrals();
            }}
            className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-white transition flex items-center gap-1.5 text-xs font-semibold"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
          <p className="text-xs font-semibold text-slate-400">Total Referrals</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{stats?.totalReferrals || 0}</p>
          <span className="text-[11px] text-[#4A7B5B] font-bold">+{stats?.newToday || 0} today</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
          <p className="text-xs font-semibold text-slate-400">Qualifying Students</p>
          <p className="text-2xl font-black text-emerald-600 mt-1">{stats?.qualifyingCount || 0}</p>
          <span className="text-[11px] text-slate-400 font-medium">1-Yr Done & Fees Paid</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
          <p className="text-xs font-semibold text-slate-400">Tier 1 Rewards (4/3)</p>
          <p className="text-2xl font-black text-blue-600 mt-1">{stats?.tier1Count || 0}</p>
          <span className="text-[11px] text-blue-500 font-bold">₹4,000 / referrer</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
          <p className="text-xs font-semibold text-slate-400">Tier 2 Rewards (8/6)</p>
          <p className="text-2xl font-black text-amber-600 mt-1">{stats?.tier2Count || 0}</p>
          <span className="text-[11px] text-amber-500 font-bold">₹10,000 / referrer</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
          <p className="text-xs font-semibold text-slate-400">Total Paid Out</p>
          <p className="text-2xl font-black text-emerald-700 mt-1">₹{(stats?.totalPaidAmount || 0).toLocaleString()}</p>
          <span className="text-[11px] text-slate-400 font-medium">{stats?.pendingApprovalRewards || 0} pending review</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2 overflow-x-auto text-xs font-bold gap-2">
        <div className="flex items-center gap-2">
          {[
            { key: 'all', label: 'All Referrals' },
            { key: 'pending', label: 'Leads Created' },
            { key: 'converted', label: 'Enrolled' },
            { key: 'pending_approval', label: 'Pending Approval' },
            { key: 'approved', label: 'Approved' },
            { key: 'paid', label: 'Paid Out' },
            { key: 'flagged', label: 'Fraud Review' },
            { key: 'policy', label: 'Policy & Simulation' },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => {
                setActiveTab(t.key as TabKey);
                setPage(1);
              }}
              className={`px-4 py-2 rounded-xl transition whitespace-nowrap ${
                activeTab === t.key
                  ? 'bg-[#4A7B5B] text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {activeTab !== 'policy' && (
          <button
            onClick={handleExportCsv}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap"
            title="Export CSV"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        )}
      </div>

      {/* POLICY MANAGER & INTERACTIVE SIMULATOR TAB */}
      {activeTab === 'policy' ? (
        <div className="space-y-6">
          {/* Active Policy Summary Card */}
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-4 gap-4">
              <div>
                <span className="text-xs font-bold text-[#4A7B5B] bg-[#E8F3EC] px-3 py-1 rounded-full uppercase">
                  Active Policy: {activePolicy?.version || 'v1.0'}
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-2">{activePolicy?.name}</h3>
                <p className="text-xs text-slate-500">{activePolicy?.description}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right text-xs">
                  <span className="text-slate-400 block font-medium">Settlement Mode</span>
                  <span className="font-bold text-slate-800">{activePolicy?.settlementMode || 'DIFFERENTIAL_UPGRADE'}</span>
                </div>
                <button
                  onClick={() => setShowCreatePolicyModal(true)}
                  className="px-4 py-2 bg-[#4A7B5B] hover:bg-[#3d694d] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
                >
                  <Plus className="w-4 h-4" />
                  New Policy Version
                </button>
              </div>
            </div>

            {/* Tiers Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activePolicy?.tiers?.map((tier) => (
                <div key={tier.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-slate-900 text-sm">{tier.name}</span>
                    <span className="font-extrabold text-[#4A7B5B] text-base">₹{tier.rewardAmount.toLocaleString()}</span>
                  </div>
                  <div className="text-xs text-slate-600 space-y-1">
                    <p>• Min Total Valid Referrals: <strong>{tier.minReferrals}</strong></p>
                    <p>• Min Qualifying Students (1-Yr Done + Fees): <strong>{tier.minQualifyingReferrals}</strong></p>
                    <p className="text-[11px] text-slate-400">Position rule: ANY {tier.minQualifyingReferrals} qualifying students in the referral pool satisfy this tier.</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Interactive Policy Simulator */}
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Play className="w-5 h-5 text-[#F0AE1A]" />
              <h3 className="text-base font-black text-slate-900">Interactive Referral Rule Simulator (Non-Mutating)</h3>
            </div>
            <p className="text-xs text-slate-500">
              Simulate aggregate referral counts against current policy rules to verify tier qualification and differential rewards without altering production data.
            </p>

            {/* Quick Presets */}
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-slate-600">
              <span className="text-slate-400 mr-1">Quick Presets:</span>
              {[
                { label: '0 / 0', r: 0, q: 0 },
                { label: '3 / 3', r: 3, q: 3 },
                { label: '4 / 2', r: 4, q: 2 },
                { label: '4 / 3 (T1)', r: 4, q: 3 },
                { label: '5 / 3 (T1)', r: 5, q: 3 },
                { label: '7 / 5 (T1)', r: 7, q: 5 },
                { label: '8 / 5 (T1)', r: 8, q: 5 },
                { label: '8 / 6 (T2)', r: 8, q: 6 },
                { label: '9 / 5 (T1)', r: 9, q: 5 },
                { label: '9 / 6 (T2)', r: 9, q: 6 },
              ].map((p) => (
                <button
                  key={p.label}
                  onClick={() => {
                    setSimTotalReferrals(p.r);
                    setSimQualifyingReferrals(p.q);
                    handleRunSimulation(p.r, p.q);
                  }}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-[#E8F3EC] hover:text-[#4A7B5B] rounded-lg transition"
                >
                  {p.label}
                </button>
              ))}
            </div>

            {simError && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> {simError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Total Valid Referrals</label>
                <input
                  type="number"
                  min="0"
                  value={simTotalReferrals}
                  onChange={(e) => setSimTotalReferrals(Number(e.target.value))}
                  className="w-full p-2.5 bg-slate-50 border rounded-xl text-xs font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Qualifying Students (1-Yr Done + Fees)</label>
                <input
                  type="number"
                  min="0"
                  value={simQualifyingReferrals}
                  onChange={(e) => setSimQualifyingReferrals(Number(e.target.value))}
                  className="w-full p-2.5 bg-slate-50 border rounded-xl text-xs font-bold"
                />
              </div>

              <div className="flex items-end">
                <button
                  onClick={() => handleRunSimulation()}
                  disabled={isSimulating}
                  className="w-full py-2.5 bg-[#4A7B5B] hover:bg-[#3d694d] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition disabled:opacity-50"
                >
                  <Play className="w-3.5 h-3.5" />
                  {isSimulating ? 'Evaluating...' : 'Run Simulation'}
                </button>
              </div>
            </div>

            {/* Simulation Result Card */}
            {simulationResult && (
              <div className="mt-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 text-white space-y-4 animate-in fade-in">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div>
                    <span className="text-[11px] text-[#A7F3D0] uppercase font-bold tracking-wider">Simulation Output</span>
                    <h4 className="text-base font-extrabold text-white mt-0.5">
                      {simulationResult.result.achievedTier
                        ? `Achieved: ${simulationResult.result.achievedTier.name}`
                        : 'No Tier Achieved'}
                    </h4>
                    <p className="text-xs text-slate-300 mt-1">{simulationResult.reason}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-400 block">Gross Entitled Reward</span>
                    <span className="text-2xl font-black text-[#F0AE1A]">
                      ₹{simulationResult.result.grossEntitledReward.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="p-2.5 bg-white/5 rounded-xl">
                    <span className="text-slate-400 block text-[10px]">Total Referrals</span>
                    <span className="font-bold text-white">{simulationResult.inputs.totalReferrals}</span>
                  </div>
                  <div className="p-2.5 bg-white/5 rounded-xl">
                    <span className="text-slate-400 block text-[10px]">Qualifying Count</span>
                    <span className="font-bold text-emerald-400">{simulationResult.inputs.qualifyingReferrals}</span>
                  </div>
                  <div className="p-2.5 bg-white/5 rounded-xl">
                    <span className="text-slate-400 block text-[10px]">Next Target</span>
                    <span className="font-bold text-slate-200">
                      {simulationResult.result.nextTier?.tier.name || 'Max Achieved'}
                    </span>
                  </div>
                  <div className="p-2.5 bg-white/5 rounded-xl">
                    <span className="text-slate-400 block text-[10px]">Missing Requirements</span>
                    <span className="font-bold text-amber-400">
                      {simulationResult.result.nextTier
                        ? `Need ${simulationResult.result.nextTier.qualifyingNeeded} more qualifying student(s)`
                        : 'None (Top Tier)'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Historical Policies List */}
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
            <h3 className="text-base font-black text-slate-900">Policy Version History & Audit Trail</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                  <tr>
                    <th className="p-3">Version</th>
                    <th className="p-3">Policy Name</th>
                    <th className="p-3">Tiers Configured</th>
                    <th className="p-3">Settlement</th>
                    <th className="p-3">Effective Date</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {policies.map((pol) => (
                    <tr key={pol.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-3 font-mono font-bold text-slate-900">{pol.version}</td>
                      <td className="p-3">
                        <div className="font-bold text-slate-800">{pol.name}</div>
                        <div className="text-[11px] text-slate-400 truncate max-w-xs">{pol.description}</div>
                      </td>
                      <td className="p-3">
                        {pol.tiers?.map((t) => (
                          <span key={t.id} className="inline-block mr-1.5 px-2 py-0.5 bg-slate-100 rounded text-[10px] font-semibold">
                            {t.name}: {t.minReferrals}/{t.minQualifyingReferrals} (₹{t.rewardAmount})
                          </span>
                        ))}
                      </td>
                      <td className="p-3 font-semibold">{pol.settlementMode}</td>
                      <td className="p-3 text-slate-500">{new Date(pol.effectiveFrom).toLocaleDateString()}</td>
                      <td className="p-3">
                        {pol.isActive ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            ACTIVE
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500">
                            HISTORICAL
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        {!pol.isActive && (
                          <button
                            onClick={() => handleActivatePolicy(pol.id)}
                            disabled={policyActionLoading}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition disabled:opacity-50"
                          >
                            Activate
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* REFERRALS QUEUE TABLE */
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden space-y-4">
          <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search candidate, mobile, code..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border rounded-xl text-xs"
              />
            </div>
            <div className="flex items-center gap-3">
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="text-xs text-slate-500 hover:text-slate-700 underline font-medium"
                >
                  Clear Search
                </button>
              )}
              <span className="text-xs text-slate-400 font-medium">Total: {totalCount} Records</span>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-6 h-6 animate-spin text-[#4A7B5B]" />
              <span>Loading referral queue from authoritative database...</span>
            </div>
          ) : error ? (
            <div className="p-12 text-center text-red-500 text-xs flex flex-col items-center justify-center gap-3">
              <AlertCircle className="w-6 h-6" />
              <span>{error}</span>
              <button
                onClick={fetchReferrals}
                className="px-4 py-2 bg-[#4A7B5B] text-white rounded-xl font-bold hover:bg-[#3d694d] transition"
              >
                Retry
              </button>
            </div>
          ) : referrals.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
              <Users className="w-8 h-8 text-slate-300" />
              <span className="font-semibold text-slate-600">No referral records found for this filter.</span>
              <span className="text-slate-400">Share student referral codes or adjust filters to view records.</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                  <tr>
                    <th className="p-4">Referred Candidate</th>
                    <th className="p-4">Referring Student</th>
                    <th className="p-4">Code</th>
                    <th className="p-4">Admission Status</th>
                    <th className="p-4">1-Yr College Done</th>
                    <th className="p-4">1-Yr Fee Paid</th>
                    <th className="p-4">Qualification</th>
                    <th className="p-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {referrals.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-4 font-bold text-slate-900">
                        <div>{item.referredName}</div>
                        <div className="text-[11px] text-slate-400 font-mono font-normal">{item.referredMobile}</div>
                      </td>
                      <td className="p-4">
                        <div className="font-semibold text-slate-800">{item.referrerStudent?.fullName || 'Student'}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{item.referrerStudent?.email}</div>
                      </td>
                      <td className="p-4 font-mono font-bold text-[#4A7B5B]">{item.referralCode}</td>
                      <td className="p-4">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800">
                          {item.status}
                        </span>
                      </td>
                      <td className="p-4">
                        {item.isOneYearCompleted ? (
                          <span className="text-emerald-700 font-bold flex items-center gap-1">✓ Yes</span>
                        ) : (
                          <span className="text-slate-400 font-medium">No</span>
                        )}
                      </td>
                      <td className="p-4">
                        {item.isOneYearFeePaid ? (
                          <span className="text-emerald-700 font-bold flex items-center gap-1">✓ Yes</span>
                        ) : (
                          <span className="text-slate-400 font-medium">No</span>
                        )}
                      </td>
                      <td className="p-4">
                        {item.isQualifying ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            QUALIFIED
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500">
                            {item.qualificationStatus || 'NOT_QUALIFIED'}
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        <button
                          onClick={() => {
                            setSelectedReferral(item);
                            setActionSuccess(null);
                            setActionError(null);
                          }}
                          className="px-3 py-1.5 bg-[#4A7B5B] text-white rounded-xl text-xs font-bold hover:bg-[#3d694d] transition"
                        >
                          Inspect & Govern
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4 border-t flex items-center justify-between text-xs text-slate-500">
              <span>Page {page} of {totalPages}</span>
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1 border rounded-lg disabled:opacity-50 font-semibold"
                >
                  Previous
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1 border rounded-lg disabled:opacity-50 font-semibold"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* INSPECTOR DRAWER */}
      {selectedReferral && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex justify-end">
          <div className="w-full max-w-lg bg-white h-full shadow-2xl p-6 overflow-y-auto space-y-5 animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <span className="text-xs font-mono text-slate-400">ID: {selectedReferral.id}</span>
                <h3 className="text-lg font-black text-slate-900 mt-1">{selectedReferral.referredName}</h3>
              </div>
              <button onClick={() => setSelectedReferral(null)} className="p-2 hover:bg-slate-100 rounded-full">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {actionSuccess && (
              <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
                <CheckCircle2 size={16} /> {actionSuccess}
              </div>
            )}

            {actionError && (
              <div className="p-3 bg-red-50 text-red-800 rounded-xl text-xs font-bold flex items-center gap-2">
                <AlertCircle size={16} /> {actionError}
              </div>
            )}

            {/* Candidate & Referrer Info */}
            <div className="p-4 bg-slate-50 rounded-2xl space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Contact:</span>
                <span className="font-bold text-slate-800">{selectedReferral.referredMobile} | {selectedReferral.referredEmail || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Referrer:</span>
                <span className="font-bold text-slate-800">{selectedReferral.referrerStudent?.fullName || 'Student'} ({selectedReferral.referrerStudent?.email})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Code:</span>
                <span className="font-mono font-bold text-[#4A7B5B]">{selectedReferral.referralCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Fraud Status:</span>
                <span className="font-bold text-slate-800">{selectedReferral.fraudStatus}</span>
              </div>
            </div>

            {/* Authoritative Qualification Update Section */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
              <h4 className="text-xs font-black uppercase text-slate-700">1-Year Milestone & Fee Qualification</h4>
              <p className="text-xs text-slate-500">
                Update whether this student has satisfied the required 1-year college duration and paid 1-year college fees.
              </p>

              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => handleUpdateQualification(true, true)}
                  disabled={drawerLoading}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition"
                >
                  ✓ Mark 1-Yr Done & Fee Paid
                </button>
                <button
                  onClick={() => handleUpdateQualification(false, false)}
                  disabled={drawerLoading}
                  className="py-2 px-3 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition"
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Governance Actions (Override Attribution & Fraud Review) */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
              <h4 className="text-xs font-black uppercase text-slate-700">Governance Overrides</h4>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowOverrideModal(true)}
                  className="flex-1 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition"
                >
                  Override Attribution
                </button>
                <button
                  onClick={() => setShowFraudModal(true)}
                  className="flex-1 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition"
                >
                  Fraud Review
                </button>
              </div>
            </div>

            {/* Rewards & Finance Payout Workflow */}
            {selectedReferral.rewards && selectedReferral.rewards.length > 0 && (
              <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase text-emerald-900">Reward Ledger</h4>
                  <span className="text-sm font-black text-emerald-700">
                    ₹{selectedReferral.rewards[0].amount.toLocaleString()}
                  </span>
                </div>

                <div className="text-xs text-emerald-800 space-y-1">
                  <p>Status: <strong>{selectedReferral.rewards[0].status}</strong></p>
                  <p>Tier: <strong>{selectedReferral.rewards[0].tierName || 'Tier 1'}</strong></p>
                  {selectedReferral.rewards[0].payoutReference && (
                    <p>UTR: <strong className="font-mono">{selectedReferral.rewards[0].payoutReference}</strong></p>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-2">
                  {selectedReferral.rewards[0].status === 'PENDING_APPROVAL' && (
                    <>
                      <button
                        onClick={() => handleApproveReward(selectedReferral.rewards![0].id)}
                        disabled={drawerLoading}
                        className="flex-1 py-2 bg-[#4A7B5B] hover:bg-[#3d694d] text-white rounded-xl text-xs font-bold transition"
                      >
                        Approve Reward
                      </button>
                      <button
                        onClick={() => {
                          setRejectRewardId(selectedReferral.rewards![0].id);
                          setShowRejectModal(true);
                        }}
                        disabled={drawerLoading}
                        className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition"
                      >
                        Reject
                      </button>
                    </>
                  )}

                  {selectedReferral.rewards[0].status === 'APPROVED' && (
                    <button
                      onClick={() => setShowPayoutModal(true)}
                      className="flex-1 py-2 bg-[#F0AE1A] hover:bg-amber-500 text-slate-900 rounded-xl text-xs font-bold transition"
                    >
                      Process Finance Payout
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Policy Modal */}
      {showCreatePolicyModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-black text-slate-900">Create Versioned Referral Policy</h3>
              <button onClick={() => setShowCreatePolicyModal(false)} className="p-1.5 hover:bg-slate-100 rounded-full">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Version</label>
                  <input
                    type="text"
                    value={newPolicyVersion}
                    onChange={(e) => setNewPolicyVersion(e.target.value)}
                    placeholder="e.g. v1.1"
                    className="w-full p-2.5 bg-slate-50 border rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Settlement Mode</label>
                  <select
                    value={newPolicySettlement}
                    onChange={(e) => setNewPolicySettlement(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border rounded-xl font-bold"
                  >
                    <option value="DIFFERENTIAL_UPGRADE">DIFFERENTIAL_UPGRADE</option>
                    <option value="HIGHEST_ACHIEVED_TIER">HIGHEST_ACHIEVED_TIER</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Policy Name</label>
                <input
                  type="text"
                  value={newPolicyName}
                  onChange={(e) => setNewPolicyName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border rounded-xl"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Description</label>
                <input
                  type="text"
                  value={newPolicyDesc}
                  onChange={(e) => setNewPolicyDesc(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border rounded-xl"
                />
              </div>

              {/* Tier 1 Config */}
              <div className="p-3 bg-slate-50 rounded-xl space-y-2 border">
                <span className="font-bold text-slate-900">Tier 1 Parameters</span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-500 block">Min Referrals</label>
                    <input
                      type="number"
                      value={newT1Refs}
                      onChange={(e) => setNewT1Refs(Number(e.target.value))}
                      className="w-full p-1.5 bg-white border rounded font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block">Min Qualifying</label>
                    <input
                      type="number"
                      value={newT1Qual}
                      onChange={(e) => setNewT1Qual(Number(e.target.value))}
                      className="w-full p-1.5 bg-white border rounded font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block">Reward (₹)</label>
                    <input
                      type="number"
                      value={newT1Reward}
                      onChange={(e) => setNewT1Reward(Number(e.target.value))}
                      className="w-full p-1.5 bg-white border rounded font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Tier 2 Config */}
              <div className="p-3 bg-slate-50 rounded-xl space-y-2 border">
                <span className="font-bold text-slate-900">Tier 2 Parameters</span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-500 block">Min Referrals</label>
                    <input
                      type="number"
                      value={newT2Refs}
                      onChange={(e) => setNewT2Refs(Number(e.target.value))}
                      className="w-full p-1.5 bg-white border rounded font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block">Min Qualifying</label>
                    <input
                      type="number"
                      value={newT2Qual}
                      onChange={(e) => setNewT2Qual(Number(e.target.value))}
                      className="w-full p-1.5 bg-white border rounded font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block">Reward (₹)</label>
                    <input
                      type="number"
                      value={newT2Reward}
                      onChange={(e) => setNewT2Reward(Number(e.target.value))}
                      className="w-full p-1.5 bg-white border rounded font-bold"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="activateNow"
                  checked={newPolicyActive}
                  onChange={(e) => setNewPolicyActive(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="activateNow" className="font-semibold text-slate-700">
                  Set as Active Policy immediately
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                onClick={() => setShowCreatePolicyModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePolicy}
                disabled={policyActionLoading}
                className="px-5 py-2 bg-[#4A7B5B] hover:bg-[#3d694d] text-white rounded-xl text-xs font-bold disabled:opacity-50"
              >
                {policyActionLoading ? 'Saving...' : 'Save & Deploy Policy'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Reward Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-base font-black text-slate-900">Reject Referral Reward</h3>
            <p className="text-xs text-slate-500">Provide mandatory governance rejection reason.</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter rejection reason..."
              rows={3}
              className="w-full p-3 bg-slate-50 border rounded-xl text-xs"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowRejectModal(false)} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold">
                Cancel
              </button>
              <button
                onClick={handleRejectReward}
                disabled={drawerLoading || !rejectReason.trim()}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold disabled:opacity-50"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Override Attribution Modal */}
      {showOverrideModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-base font-black text-slate-900">Override Referral Attribution</h3>
            <p className="text-xs text-slate-500">Transfer candidate attribution to a verified referrer code or user ID.</p>
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">New Referrer Code or User ID</label>
                <input
                  type="text"
                  placeholder="e.g. SWY-JOHN-A1B2"
                  value={overrideCode}
                  onChange={(e) => setOverrideCode(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border rounded-xl font-mono font-bold"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Override Reason</label>
                <input
                  type="text"
                  placeholder="e.g. Verified student lead source correction"
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border rounded-xl"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowOverrideModal(false)} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold">
                Cancel
              </button>
              <button
                onClick={handleOverrideAttribution}
                disabled={drawerLoading || !overrideCode.trim() || !overrideReason.trim()}
                className="px-5 py-2 bg-[#4A7B5B] hover:bg-[#3d694d] text-white rounded-xl text-xs font-bold disabled:opacity-50"
              >
                Transfer Attribution
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fraud Review Modal */}
      {showFraudModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-base font-black text-slate-900">Fraud & Integrity Review</h3>
            <p className="text-xs text-slate-500">Commit security decision on this referral record.</p>
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Security Decision</label>
                <select
                  value={fraudDecision}
                  onChange={(e: any) => setFraudDecision(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border rounded-xl font-bold"
                >
                  <option value="APPROVED">APPROVED (Verified Genuine)</option>
                  <option value="FLAGGED_FOR_REVIEW">FLAGGED_FOR_REVIEW</option>
                  <option value="REJECTED">REJECTED (Fraud / Disqualified)</option>
                </select>
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Review Notes</label>
                <textarea
                  value={fraudReason}
                  onChange={(e) => setFraudReason(e.target.value)}
                  placeholder="Enter audit notes..."
                  rows={2}
                  className="w-full p-2.5 bg-slate-50 border rounded-xl"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowFraudModal(false)} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold">
                Cancel
              </button>
              <button
                onClick={handleFraudReview}
                disabled={drawerLoading}
                className="px-5 py-2 bg-[#4A7B5B] hover:bg-[#3d694d] text-white rounded-xl text-xs font-bold"
              >
                Save Decision
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payout Modal */}
      {showPayoutModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-base font-black text-slate-900">Complete Reward Payout</h3>
            <p className="text-xs text-slate-500">Record authoritative bank / UPI transaction reference.</p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Payout Method</label>
                <select
                  value={payoutMethod}
                  onChange={(e: any) => setPayoutMethod(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border rounded-xl font-bold"
                >
                  <option value="UPI">UPI Transfer</option>
                  <option value="BANK_TRANSFER">NEFT / RTGS / IMPS</option>
                  <option value="WALLET">Swayam Wallet</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Bank UTR / Transaction Reference</label>
                <input
                  type="text"
                  placeholder="e.g. UPI-UTR-293849102938"
                  value={payoutRef}
                  onChange={(e) => setPayoutRef(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border rounded-xl font-mono font-bold"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowPayoutModal(false)} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold">
                Cancel
              </button>
              <button
                onClick={handleProcessPayout}
                disabled={drawerLoading || !payoutRef.trim()}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold disabled:opacity-50"
              >
                {drawerLoading ? 'Processing...' : 'Confirm Payout'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReferralManagementPage;
