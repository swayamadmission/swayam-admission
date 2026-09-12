import React, { useState, useEffect } from 'react';
import {
  Tag,
  Search,
  Filter,
  Plus,
  RefreshCw,
  TrendingUp,
  Award,
  CheckCircle2,
  AlertCircle,
  Clock,
  Eye,
  Edit2,
  Trash2,
  ToggleLeft,
  ToggleRight,
  DollarSign,
  Calendar,
  Layers,
  Users,
  X,
  Sparkles,
  Percent,
} from 'lucide-react';
import {
  couponsApi,
  CouponItem,
  CouponAnalytics,
  CouponRedemptionItem,
  CreateCouponPayload,
} from '../../api/coupons.api';

export const CouponManagementPage: React.FC = () => {
  const [coupons, setCoupons] = useState<CouponItem[]>([]);
  const [analytics, setAnalytics] = useState<CouponAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [scopeFilter, setScopeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Redemptions Drawer State
  const [showRedemptionsDrawer, setShowRedemptionsDrawer] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState<CouponItem | null>(null);
  const [redemptions, setRedemptions] = useState<CouponRedemptionItem[]>([]);
  const [redemptionsLoading, setRedemptionsLoading] = useState(false);

  // Create / Edit Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<CouponItem | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form Fields
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [discountType, setDiscountType] = useState<'PERCENTAGE' | 'FIXED'>('PERCENTAGE');
  const [discountValue, setDiscountValue] = useState<number>(20);
  const [maxDiscountAmount, setMaxDiscountAmount] = useState<number | ''>(1000);
  const [minTransactionAmount, setMinTransactionAmount] = useState<number>(2000);
  const [applicableScope, setApplicableScope] = useState('ALL');
  const [academicSession, setAcademicSession] = useState('2026-2027');
  const [validFrom, setValidFrom] = useState(new Date().toISOString().slice(0, 10));
  const [validUntil, setValidUntil] = useState('');
  const [maxUsageCount, setMaxUsageCount] = useState<number | ''>(500);
  const [maxUsagePerUser, setMaxUsagePerUser] = useState<number>(1);
  const [isActive, setIsActive] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [listRes, analyticsRes] = await Promise.all([
        couponsApi.getCoupons(),
        couponsApi.getAnalytics(),
      ]);
      setCoupons(listRes || []);
      setAnalytics(analyticsRes);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load coupon registry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCreateModal = () => {
    setEditingCoupon(null);
    setCode('');
    setDescription('');
    setDiscountType('PERCENTAGE');
    setDiscountValue(20);
    setMaxDiscountAmount(1000);
    setMinTransactionAmount(2000);
    setApplicableScope('ALL');
    setAcademicSession('2026-2027');
    setValidFrom(new Date().toISOString().slice(0, 10));
    setValidUntil('');
    setMaxUsageCount(500);
    setMaxUsagePerUser(1);
    setIsActive(true);
    setFormError(null);
    setShowModal(true);
  };

  const openEditModal = (c: CouponItem) => {
    setEditingCoupon(c);
    setCode(c.code);
    setDescription(c.description || '');
    setDiscountType(c.discountType);
    setDiscountValue(c.discountValue);
    setMaxDiscountAmount(c.maxDiscountAmount ?? '');
    setMinTransactionAmount(c.minTransactionAmount);
    setApplicableScope(c.applicableScope);
    setAcademicSession(c.academicSession || '');
    setValidFrom(c.validFrom ? new Date(c.validFrom).toISOString().slice(0, 10) : '');
    setValidUntil(c.validUntil ? new Date(c.validUntil).toISOString().slice(0, 10) : '');
    setMaxUsageCount(c.maxUsageCount ?? '');
    setMaxUsagePerUser(c.maxUsagePerUser);
    setIsActive(c.isActive);
    setFormError(null);
    setShowModal(true);
  };

  const handleSaveCoupon = async () => {
    if (!code.trim()) {
      setFormError('Coupon code is required.');
      return;
    }
    if (discountValue <= 0) {
      setFormError('Discount value must be greater than 0.');
      return;
    }

    const payload: CreateCouponPayload = {
      code: code.trim().toUpperCase(),
      description: description.trim() || undefined,
      discountType,
      discountValue: Number(discountValue),
      maxDiscountAmount: maxDiscountAmount !== '' ? Number(maxDiscountAmount) : undefined,
      minTransactionAmount: Number(minTransactionAmount || 0),
      applicableScope,
      academicSession: academicSession.trim() || undefined,
      validFrom: validFrom ? new Date(validFrom).toISOString() : undefined,
      validUntil: validUntil ? new Date(validUntil).toISOString() : undefined,
      maxUsageCount: maxUsageCount !== '' ? Number(maxUsageCount) : undefined,
      maxUsagePerUser: Number(maxUsagePerUser || 1),
      isActive,
    };

    try {
      setModalLoading(true);
      setFormError(null);
      if (editingCoupon) {
        await couponsApi.updateCoupon(editingCoupon.id, payload);
      } else {
        await couponsApi.createCoupon(payload);
      }
      setShowModal(false);
      await fetchData();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to save coupon.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleToggleStatus = async (c: CouponItem) => {
    try {
      await couponsApi.toggleStatus(c.id);
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to toggle status.');
    }
  };

  const handleDeleteCoupon = async (c: CouponItem) => {
    if (!confirm(`Are you sure you want to remove or deactivate coupon "${c.code}"?`)) return;
    try {
      await couponsApi.deleteCoupon(c.id);
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete coupon.');
    }
  };

  const handleViewRedemptions = async (c: CouponItem) => {
    setSelectedCoupon(c);
    setShowRedemptionsDrawer(true);
    try {
      setRedemptionsLoading(true);
      const res = await couponsApi.getRedemptions(c.id);
      setRedemptions(res || []);
    } catch (err: any) {
      console.warn('Failed to load redemptions:', err);
    } finally {
      setRedemptionsLoading(false);
    }
  };

  // Filtered List
  const filteredCoupons = coupons.filter((c) => {
    const matchesSearch =
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      (c.description && c.description.toLowerCase().includes(search.toLowerCase()));

    const matchesScope = scopeFilter === 'ALL' || c.applicableScope === scopeFilter;

    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' && c.isActive) ||
      (statusFilter === 'INACTIVE' && !c.isActive);

    return matchesSearch && matchesScope && matchesStatus;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-[#0F172A] to-[#1E293B] p-6 rounded-3xl text-white shadow-sm border border-white/10">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#4A7B5B]/30 text-[#E8F3EC] border border-[#4A7B5B]/40 text-xs font-semibold mb-2">
            <Tag className="w-3.5 h-3.5 text-[#F0AE1A]" />
            Promotional & Discount Engine
          </div>
          <h1 className="text-2xl font-black text-white">Coupons & Discounts Governance</h1>
          <p className="text-xs text-slate-300 mt-1">
            Authoritative coupon discounts across Application fees, Study Materials, and Tuition Fees with atomic redemption.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={openCreateModal}
            className="px-4 py-2.5 bg-[#4A7B5B] hover:bg-[#3d694d] text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Create Coupon
          </button>
          <button
            onClick={fetchData}
            className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-white transition flex items-center gap-1.5 text-xs font-semibold"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
          <p className="text-xs font-semibold text-slate-400">Total Coupons</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{analytics?.totalCoupons || coupons.length}</p>
          <span className="text-[11px] text-[#4A7B5B] font-bold">{analytics?.activeCoupons || 0} active</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
          <p className="text-xs font-semibold text-slate-400">Active Coupons</p>
          <p className="text-2xl font-black text-emerald-600 mt-1">{analytics?.activeCoupons || 0}</p>
          <span className="text-[11px] text-slate-400 font-medium">Available to apply</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
          <p className="text-xs font-semibold text-slate-400">Total Redemptions</p>
          <p className="text-2xl font-black text-blue-600 mt-1">{analytics?.totalRedemptions || 0}</p>
          <span className="text-[11px] text-blue-500 font-bold">Successfully claimed</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
          <p className="text-xs font-semibold text-slate-400">Discounts Disbursed</p>
          <p className="text-2xl font-black text-amber-600 mt-1">
            ₹{(analytics?.totalDiscountDisbursed || 0).toLocaleString()}
          </p>
          <span className="text-[11px] text-amber-500 font-bold">Total student savings</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
          <p className="text-xs font-semibold text-slate-400">Gross Transaction Volume</p>
          <p className="text-2xl font-black text-purple-700 mt-1">
            ₹{(analytics?.totalGrossVolume || 0).toLocaleString()}
          </p>
          <span className="text-[11px] text-slate-400 font-medium">Coupon-assisted orders</span>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden space-y-4">
        <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search coupon code or description..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border rounded-xl text-xs"
              />
            </div>

            {/* Scope Filter */}
            <select
              value={scopeFilter}
              onChange={(e) => setScopeFilter(e.target.value)}
              className="p-2 bg-slate-50 border rounded-xl text-xs font-bold text-slate-700"
            >
              <option value="ALL">All Payment Scopes</option>
              <option value="COUNSELLING_FEE">Counselling Fee</option>
              <option value="APPLICATION_FEE">Application Fee</option>
              <option value="STUDY_MATERIAL_FEE">Study Material Fee</option>
              <option value="TUITION_FEE">Tuition Fee</option>
              <option value="SECURITY_DEPOSIT">Security Deposit</option>
              <option value="REGISTRATION_FEE">Registration Fee</option>
              <option value="ADMISSION_FEE">Admission Fee</option>
              <option value="EXAMINATION_FEE">Examination Fee</option>
              <option value="ENROLLMENT_FEE">Enrollment Fee</option>
              <option value="HOSTEL_FEE">Hostel Fee</option>
              <option value="MISC_FEE">Misc Activity Fee</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e: any) => setStatusFilter(e.target.value)}
              className="p-2 bg-slate-50 border rounded-xl text-xs font-bold text-slate-700"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active Only</option>
              <option value="INACTIVE">Inactive Only</option>
            </select>
          </div>

          <span className="text-xs text-slate-400 font-medium">
            Showing {filteredCoupons.length} of {coupons.length} Coupons
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-[#4A7B5B]" />
            <span>Loading coupons...</span>
          </div>
        ) : error ? (
          <div className="p-12 text-center text-red-500 text-xs flex flex-col items-center justify-center gap-3">
            <AlertCircle className="w-6 h-6" />
            <span>{error}</span>
            <button
              onClick={fetchData}
              className="px-4 py-2 bg-[#4A7B5B] text-white rounded-xl font-bold hover:bg-[#3d694d] transition"
            >
              Retry
            </button>
          </div>
        ) : filteredCoupons.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
            <Tag className="w-8 h-8 text-slate-300" />
            <span className="font-semibold text-slate-600">No coupons found matching your criteria.</span>
            <button
              onClick={openCreateModal}
              className="mt-2 px-4 py-2 bg-[#4A7B5B] text-white rounded-xl font-bold hover:bg-[#3d694d] transition"
            >
              Create First Coupon
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                <tr>
                  <th className="p-4">Coupon Code</th>
                  <th className="p-4">Discount</th>
                  <th className="p-4">Min Amount</th>
                  <th className="p-4">Scope</th>
                  <th className="p-4">Usage</th>
                  <th className="p-4">Validity</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredCoupons.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-4">
                      <div className="font-mono font-black text-sm text-[#0F172A] flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-[#4A7B5B]" />
                        {c.code}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate max-w-xs">{c.description || 'Promotional coupon'}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-extrabold text-[#4A7B5B] text-sm">
                        {c.discountType === 'PERCENTAGE'
                          ? `${c.discountValue}% OFF`
                          : `₹${c.discountValue.toLocaleString()} FLAT`}
                      </div>
                      {c.maxDiscountAmount && (
                        <span className="text-[10px] text-slate-400 block font-medium">
                          Max: ₹{c.maxDiscountAmount.toLocaleString()}
                        </span>
                      )}
                    </td>
                    <td className="p-4 font-bold text-slate-800">
                      ₹{c.minTransactionAmount.toLocaleString()}
                    </td>
                    <td className="p-4">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800">
                        {c.applicableScope}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-slate-800">
                        {c.currentUsageCount} / {c.maxUsageCount ? c.maxUsageCount : '∞'}
                      </div>
                      <span className="text-[10px] text-slate-400">Limit: {c.maxUsagePerUser}/user</span>
                    </td>
                    <td className="p-4 text-[11px] text-slate-500">
                      <div>From: {new Date(c.validFrom).toLocaleDateString()}</div>
                      <div>Until: {c.validUntil ? new Date(c.validUntil).toLocaleDateString() : 'No expiry'}</div>
                    </td>
                    <td className="p-4">
                      {c.isActive ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          ACTIVE
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500">
                          INACTIVE
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleViewRedemptions(c)}
                          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600"
                          title="View Redemptions"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEditModal(c)}
                          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600"
                          title="Edit Coupon"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(c)}
                          className={`p-1.5 rounded-lg transition ${
                            c.isActive ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'
                          }`}
                          title={c.isActive ? 'Deactivate' : 'Activate'}
                        >
                          {c.isActive ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                        </button>
                        <button
                          onClick={() => handleDeleteCoupon(c)}
                          className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE / EDIT MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-xl w-full space-y-4 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-black text-slate-900">
                {editingCoupon ? `Edit Coupon: ${editingCoupon.code}` : 'Create New Coupon'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-slate-100 rounded-full">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> {formError}
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Coupon Code *</label>
                  <input
                    type="text"
                    placeholder="e.g. SAVE20, FLAT500"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="w-full p-2.5 bg-slate-50 border rounded-xl font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Discount Type *</label>
                  <select
                    value={discountType}
                    onChange={(e: any) => setDiscountType(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border rounded-xl font-bold"
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FIXED">Fixed Amount (₹)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Description</label>
                <input
                  type="text"
                  placeholder="e.g. 20% discount on all application fees"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border rounded-xl"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Discount Value * {discountType === 'PERCENTAGE' ? '(%)' : '(₹)'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 border rounded-xl font-bold"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Max Discount Cap (₹)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Optional (e.g. 1000)"
                    value={maxDiscountAmount}
                    onChange={(e) => setMaxDiscountAmount(e.target.value ? Number(e.target.value) : '')}
                    className="w-full p-2.5 bg-slate-50 border rounded-xl"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Min Transaction (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={minTransactionAmount}
                    onChange={(e) => setMinTransactionAmount(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 border rounded-xl font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Applicable Scope</label>
                  <select
                    value={applicableScope}
                    onChange={(e) => setApplicableScope(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border rounded-xl font-bold"
                  >
                    <option value="ALL">All Fee Types & Modules</option>
                    <option value="COUNSELLING_FEE">Counselling Fee</option>
                    <option value="APPLICATION_FEE">Application Fee</option>
                    <option value="STUDY_MATERIAL_FEE">Study Material Fee</option>
                    <option value="TUITION_FEE">Tuition Fee</option>
                    <option value="SECURITY_DEPOSIT">Caution / Security Deposit</option>
                    <option value="REGISTRATION_FEE">Registration Fee</option>
                    <option value="ADMISSION_FEE">Admission Confirmation Fee</option>
                    <option value="EXAMINATION_FEE">Examination Fee</option>
                    <option value="ENROLLMENT_FEE">Enrollment ID Fee</option>
                    <option value="HOSTEL_FEE">Hostel & Residential Fee</option>
                    <option value="MISC_FEE">Miscellaneous Lab & Activity Fee</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Academic Session</label>
                  <input
                    type="text"
                    value={academicSession}
                    onChange={(e) => setAcademicSession(e.target.value)}
                    placeholder="e.g. 2026-2027"
                    className="w-full p-2.5 bg-slate-50 border rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Valid From</label>
                  <input
                    type="date"
                    value={validFrom}
                    onChange={(e) => setValidFrom(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Valid Until (Expiry)</label>
                  <input
                    type="date"
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Global Usage Limit</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Leave blank for unlimited"
                    value={maxUsageCount}
                    onChange={(e) => setMaxUsageCount(e.target.value ? Number(e.target.value) : '')}
                    className="w-full p-2.5 bg-slate-50 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Per User Limit</label>
                  <input
                    type="number"
                    min="1"
                    value={maxUsagePerUser}
                    onChange={(e) => setMaxUsagePerUser(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 border rounded-xl font-bold"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="couponActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="couponActive" className="font-semibold text-slate-700">
                  Coupon is Active and ready for redemptions
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCoupon}
                disabled={modalLoading}
                className="px-5 py-2 bg-[#4A7B5B] hover:bg-[#3d694d] text-white rounded-xl text-xs font-bold disabled:opacity-50"
              >
                {modalLoading ? 'Saving...' : editingCoupon ? 'Update Coupon' : 'Create Coupon'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REDEMPTIONS DRAWER */}
      {showRedemptionsDrawer && selectedCoupon && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex justify-end">
          <div className="w-full max-w-lg bg-white h-full shadow-2xl p-6 overflow-y-auto space-y-5 animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <span className="text-xs font-bold text-[#4A7B5B] uppercase tracking-wider">Redemption Audit</span>
                <h3 className="text-lg font-black text-slate-900 mt-1">
                  Coupon: {selectedCoupon.code}
                </h3>
              </div>
              <button onClick={() => setShowRedemptionsDrawer(false)} className="p-2 hover:bg-slate-100 rounded-full">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl space-y-1 text-xs">
              <p>Total Claimed: <strong>{redemptions.length}</strong></p>
              <p>
                Discount Amount:{' '}
                <strong>
                  {selectedCoupon.discountType === 'PERCENTAGE'
                    ? `${selectedCoupon.discountValue}% (Max ₹${selectedCoupon.maxDiscountAmount || '∞'})`
                    : `₹${selectedCoupon.discountValue}`}
                </strong>
              </p>
            </div>

            {redemptionsLoading ? (
              <div className="p-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-[#4A7B5B]" />
                <span>Loading redemptions history...</span>
              </div>
            ) : redemptions.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs">
                No redemptions recorded yet for this coupon code.
              </div>
            ) : (
              <div className="space-y-3">
                {redemptions.map((r) => (
                  <div key={r.id} className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl text-xs space-y-1">
                    <div className="flex justify-between font-bold text-slate-900">
                      <span>{r.user?.fullName || 'Student'}</span>
                      <span className="text-emerald-700">-₹{r.discountAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>{r.user?.email || r.user?.mobile}</span>
                      <span>Net: ₹{r.finalAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                      <span>Scope: {r.transactionType}</span>
                      <span>{new Date(r.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CouponManagementPage;
