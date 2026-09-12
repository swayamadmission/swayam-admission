import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  Edit2,
  ToggleLeft,
  ToggleRight,
  Calculator,
  Layers,
  Sparkles,
  Tag,
  ShieldCheck,
  Building2,
  GraduationCap,
  Percent,
  Check,
  AlertTriangle,
} from 'lucide-react';
import {
  feesApi,
  FeeTypeItem,
  CreateFeeTypePayload,
  CalculateFeeResult,
} from '../../api/fees.api';
import { collegesApi } from '../../api/colleges.api';
import { coursesApi } from '../../api/courses.api';

const CANONICAL_CATEGORIES = [
  'ADMISSION',
  'APPLICATION',
  'COUNSELLING',
  'ACADEMIC',
  'STUDY_MATERIAL',
  'TUITION',
  'EXAMINATION',
  'ENROLLMENT',
  'REGISTRATION',
  'HOSTEL',
  'DEPOSIT',
  'SECURITY_DEPOSIT',
  'SERVICE',
  'SCHOLARSHIP',
  'TRANSPORT',
  'LAB',
  'LIBRARY',
  'CERTIFICATION',
  'PLACEMENT',
  'SPORTS',
  'ACTIVITY',
  'ALUMNI',
  'OTHER',
];

const CANONICAL_FEE_CODES = [
  { code: 'APPLICATION_FEE', label: 'College Application Fee', category: 'APPLICATION', defaultAmount: 1500 },
  { code: 'COUNSELLING_FEE', label: 'Admission Counselling Fee', category: 'COUNSELLING', defaultAmount: 1000 },
  { code: 'STUDY_MATERIAL_FEE', label: 'Academic Study Material Kit', category: 'STUDY_MATERIAL', defaultAmount: 2000 },
  { code: 'TUITION_FEE', label: 'Academic Tuition Fee', category: 'TUITION', defaultAmount: 50000 },
  { code: 'SECURITY_DEPOSIT', label: 'Refundable Caution Security Deposit', category: 'SECURITY_DEPOSIT', defaultAmount: 5000 },
  { code: 'REGISTRATION_FEE', label: 'University Registration Fee', category: 'REGISTRATION', defaultAmount: 2500 },
  { code: 'ADMISSION_FEE', label: 'Seat Confirmation & Admission Fee', category: 'ADMISSION', defaultAmount: 10000 },
  { code: 'EXAMINATION_FEE', label: 'Semester Examination Fee', category: 'EXAMINATION', defaultAmount: 3000 },
  { code: 'ENROLLMENT_FEE', label: 'Student Enrollment ID Fee', category: 'ENROLLMENT', defaultAmount: 1200 },
  { code: 'HOSTEL_FEE', label: 'Hostel & Residential Fee', category: 'HOSTEL', defaultAmount: 35000 },
  { code: 'MISC_FEE', label: 'Miscellaneous Activity & Lab Fee', category: 'OTHER', defaultAmount: 1000 },
];

export const FeeManagementPage: React.FC = () => {
  const [fees, setFees] = useState<FeeTypeItem[]>([]);
  const [categories, setCategories] = useState<string[]>(CANONICAL_CATEGORIES);
  const [colleges, setColleges] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // Create / Edit Modal
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [customCategoryInput, setCustomCategoryInput] = useState<string>('');
  const [isCustomCategory, setIsCustomCategory] = useState<boolean>(false);
  const [modalSubmitting, setModalSubmitting] = useState<boolean>(false);
  const [formData, setFormData] = useState<CreateFeeTypePayload>({
    code: '',
    name: '',
    description: '',
    category: 'ADMISSION',
    defaultAmount: 1000,
    currency: 'INR',
    isRefundable: false,
    isMandatory: true,
    isCouponEligible: true,
    isPaymentEnabled: true,
    applicableScope: 'ALL',
    collegeId: '',
    courseId: '',
    branchId: '',
    academicSession: '2026-2027',
    displayOrder: 1,
    isActive: true,
  });

  // Interactive Fee Calculator Modal
  const [showCalcModal, setShowCalcModal] = useState<boolean>(false);
  const [calcForm, setCalcForm] = useState({
    feeTypeCode: 'COUNSELLING_FEE',
    customAmount: 1000,
    couponCode: '',
    collegeId: '',
    courseId: '',
    academicSession: '2026-2027',
  });
  const [calcResult, setCalcResult] = useState<CalculateFeeResult | null>(null);
  const [calcLoading, setCalcLoading] = useState<boolean>(false);

  useEffect(() => {
    fetchMetadata();
  }, []);

  useEffect(() => {
    fetchFees();
  }, [categoryFilter]);

  const fetchMetadata = async () => {
    try {
      const [catsRes, collegesRes, coursesRes] = await Promise.allSettled([
        feesApi.getCategories(),
        collegesApi.findAll({ limit: 100 }),
        coursesApi.findAll({ limit: 100 }),
      ]);

      if (catsRes.status === 'fulfilled' && Array.isArray(catsRes.value) && catsRes.value.length > 0) {
        const merged = Array.from(new Set([...CANONICAL_CATEGORIES, ...catsRes.value]));
        setCategories(merged);
      }

      if (collegesRes.status === 'fulfilled') {
        const cData = collegesRes.value?.data?.data || collegesRes.value?.data || [];
        setColleges(Array.isArray(cData) ? cData : []);
      }

      if (coursesRes.status === 'fulfilled') {
        const crData = coursesRes.value?.data?.data || coursesRes.value?.data || [];
        setCourses(Array.isArray(crData) ? crData : []);
      }
    } catch (e) {
      console.warn('Failed to load colleges or categories metadata:', e);
    }
  };

  const fetchFees = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await feesApi.getAdminCatalog({
        category: categoryFilter !== 'ALL' ? categoryFilter : undefined,
      });
      const list = Array.isArray(data) ? data : ((data as any)?.data || []);
      setFees(list);
    } catch (err: any) {
      console.error('Failed to load fee catalog:', err);
      setError(err?.response?.data?.message || err?.message || 'Failed to load fee structures.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setIsCustomCategory(false);
    setCustomCategoryInput('');
    setFormData({
      code: '',
      name: '',
      description: '',
      category: 'ADMISSION',
      defaultAmount: 1000,
      currency: 'INR',
      isRefundable: false,
      isMandatory: true,
      isCouponEligible: true,
      isPaymentEnabled: true,
      applicableScope: 'ALL',
      collegeId: '',
      courseId: '',
      branchId: '',
      academicSession: '2026-2027',
      displayOrder: fees.length + 1,
      isActive: true,
    });
    setShowModal(true);
  };

  const handleOpenEdit = (item: FeeTypeItem) => {
    setEditingId(item.id);
    const isCustom = !categories.includes(item.category);
    setIsCustomCategory(isCustom);
    setCustomCategoryInput(isCustom ? item.category : '');
    setFormData({
      code: item.code,
      name: item.name,
      description: item.description || '',
      category: item.category,
      defaultAmount: item.defaultAmount,
      currency: item.currency || 'INR',
      isRefundable: item.isRefundable ?? false,
      isMandatory: item.isMandatory ?? true,
      isCouponEligible: item.isCouponEligible ?? true,
      isPaymentEnabled: item.isPaymentEnabled ?? true,
      applicableScope: item.applicableScope || 'ALL',
      collegeId: item.collegeId || '',
      courseId: item.courseId || '',
      branchId: item.branchId || '',
      academicSession: item.academicSession || '2026-2027',
      displayOrder: item.displayOrder,
      isActive: item.isActive,
    });
    setShowModal(true);
  };

  const handleSelectPredefined = (item: { code: string; label: string; category: string; defaultAmount: number }) => {
    setFormData({
      ...formData,
      code: item.code,
      name: item.label,
      category: item.category,
      defaultAmount: item.defaultAmount,
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setModalSubmitting(true);
      const categoryToUse = (isCustomCategory && customCategoryInput.trim()
        ? customCategoryInput.trim().toUpperCase()
        : formData.category || 'ADMISSION').toUpperCase();

      const payload: CreateFeeTypePayload = {
        ...formData,
        code: formData.code.trim().toUpperCase(),
        name: formData.name.trim(),
        description: formData.description?.trim() || undefined,
        category: categoryToUse,
        defaultAmount: Number(formData.defaultAmount),
        collegeId: formData.collegeId ? formData.collegeId : undefined,
        courseId: formData.courseId ? formData.courseId : undefined,
        branchId: formData.branchId ? formData.branchId : undefined,
        academicSession: formData.academicSession?.trim() || '2026-2027',
      };

      if (editingId) {
        await feesApi.updateFeeType(editingId, payload);
        setSaveSuccess(`Fee structure "${payload.name}" updated successfully.`);
      } else {
        await feesApi.createFeeType(payload);
        setSaveSuccess(`New fee structure "${payload.name}" created and active.`);
      }

      setShowModal(false);
      setTimeout(() => setSaveSuccess(null), 4000);
      await fetchFees();
      await fetchMetadata();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save fee structure.');
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await feesApi.toggleFeeTypeStatus(id);
      fetchFees();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to toggle fee status.');
    }
  };

  const handleRunCalculation = async () => {
    try {
      setCalcLoading(true);
      const res = await feesApi.calculateFee({
        feeTypeCode: calcForm.feeTypeCode,
        customAmount: Number(calcForm.customAmount),
        couponCode: calcForm.couponCode?.trim() || undefined,
        collegeId: calcForm.collegeId || undefined,
        courseId: calcForm.courseId || undefined,
        academicSession: calcForm.academicSession || undefined,
      });
      setCalcResult(res);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Calculation failed.');
    } finally {
      setCalcLoading(false);
    }
  };

  const filtered = fees.filter(
    (f) =>
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.code.toLowerCase().includes(search.toLowerCase()) ||
      (f.category && f.category.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="p-5 lg:p-8 space-y-6" style={{ background: '#F8FAFC', minHeight: '100%' }}>
      {/* Toast Notification */}
      {saveSuccess && (
        <div className="flex items-center gap-2 p-4 rounded-xl text-sm font-medium bg-[#E8F3EC] text-[#4A7B5B] border border-[#4A7B5B]/30 shadow-sm transition">
          <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
          <span>{saveSuccess}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0F172A] p-6 rounded-2xl text-white shadow-lg border border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#4A7B5B]/20 border border-[#4A7B5B]/30 text-[#E8F3EC]">
              <CreditCard className="h-5 w-5 text-[#4A7B5B]" />
            </div>
            <h1 className="text-xl lg:text-2xl font-bold tracking-tight">Central Fee Catalog & Pricing Engine</h1>
            <span className="bg-[#4A7B5B]/20 text-[#E8F3EC] border border-[#4A7B5B]/30 text-[11px] px-2.5 py-0.5 rounded-full font-semibold">
              Live DB
            </span>
          </div>
          <p className="text-xs lg:text-sm text-slate-400">
            Define, govern, and simulate institutional fee structures with full coupon, scholarship & referral discount integration.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCalcModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition"
          >
            <Calculator className="h-4 w-4 text-[#4A7B5B]" />
            Fee Engine Simulator
          </button>
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2 bg-[#4A7B5B] hover:bg-[#3D664B] text-white rounded-xl text-xs font-semibold shadow transition"
          >
            <Plus className="h-4 w-4" />
            Add Fee Structure
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 lg:p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Fee Structures</div>
          <div className="text-2xl font-bold text-[#0F172A] mt-1">{fees.length}</div>
          <div className="text-xs text-slate-500 mt-1">Configured in central catalog</div>
        </div>
        <div className="bg-white p-4 lg:p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Admission & Counselling</div>
          <div className="text-2xl font-bold text-[#4A7B5B] mt-1">
            {fees.filter((f) => ['ADMISSION', 'COUNSELLING', 'APPLICATION', 'REGISTRATION', 'ENROLLMENT'].includes(f.category)).length}
          </div>
          <div className="text-xs text-slate-500 mt-1">Counselling, Application, Seats</div>
        </div>
        <div className="bg-white p-4 lg:p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Academic & Materials</div>
          <div className="text-2xl font-bold text-slate-800 mt-1">
            {fees.filter((f) => ['ACADEMIC', 'TUITION', 'STUDY_MATERIAL', 'EXAMINATION'].includes(f.category)).length}
          </div>
          <div className="text-xs text-slate-500 mt-1">Tuition, Exams, Kits</div>
        </div>
        <div className="bg-white p-4 lg:p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Hostel & Deposits</div>
          <div className="text-2xl font-bold text-amber-600 mt-1">
            {fees.filter((f) => ['HOSTEL', 'DEPOSIT', 'SECURITY_DEPOSIT', 'OTHER', 'SERVICE'].includes(f.category)).length}
          </div>
          <div className="text-xs text-slate-500 mt-1">Caution Deposits & Lodging</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="space-y-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-80 relative">
            <Search className="h-4 w-4 absolute left-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search fee code, name, category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs lg:text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-[#4A7B5B]"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchFees}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 hover:text-[#4A7B5B] rounded-xl hover:bg-[#E8F3EC] border border-slate-200 transition"
              title="Refresh fee list"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Dynamic Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <button
            onClick={() => setCategoryFilter('ALL')}
            className={`px-3 py-1.5 rounded-full font-medium whitespace-nowrap transition ${
              categoryFilter === 'ALL'
                ? 'bg-[#4A7B5B] text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            ALL ({fees.length})
          </button>
          {categories.map((cat) => {
            const count = fees.filter((f) => f.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-full font-medium whitespace-nowrap transition ${
                  categoryFilter === cat
                    ? 'bg-[#4A7B5B] text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat.replace(/_/g, ' ')} {count > 0 && <span className="opacity-75">({count})</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Fee Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Order</th>
                <th className="py-3 px-4">Fee Structure</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Default Amount</th>
                <th className="py-3 px-4">Eligibility & Scope</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs lg:text-sm">
              {loading && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto text-[#4A7B5B] mb-2" />
                    Loading authoritative fee structures...
                  </td>
                </tr>
              )}

              {!loading && error && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-red-600">
                    <AlertTriangle className="h-6 w-6 mx-auto mb-2 text-red-500" />
                    <div>{error}</div>
                    <button
                      onClick={fetchFees}
                      className="mt-3 px-4 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-semibold hover:bg-slate-700"
                    >
                      Retry Query
                    </button>
                  </td>
                </tr>
              )}

              {!loading && !error && filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No fee structures found for category &quot;{categoryFilter}&quot;.
                  </td>
                </tr>
              )}

              {!loading &&
                !error &&
                filtered.map((item) => {
                  const collegeName = colleges.find((c) => c.id === item.collegeId)?.name;
                  const courseName = courses.find((c) => c.id === item.courseId)?.name;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-500 font-semibold">
                        #{item.displayOrder}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{item.name}</div>
                        <div className="font-mono text-xs text-[#4A7B5B] font-bold mt-0.5">{item.code}</div>
                        {item.description && (
                          <div className="text-xs text-slate-500 mt-0.5 max-w-md line-clamp-1">
                            {item.description}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#E8F3EC] text-[#4A7B5B] border border-[#4A7B5B]/30">
                          {item.category.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        ₹{item.defaultAmount.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1.5 items-center">
                          <span
                            className={`text-[11px] px-2 py-0.5 rounded font-semibold ${
                              item.isMandatory
                                ? 'bg-red-50 text-red-700 border border-red-200'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {item.isMandatory ? 'Mandatory' : 'Optional'}
                          </span>
                          <span
                            className={`text-[11px] px-2 py-0.5 rounded font-semibold ${
                              item.isRefundable
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {item.isRefundable ? 'Refundable' : 'Non-Refundable'}
                          </span>
                          {item.isCouponEligible !== false && (
                            <span className="text-[11px] px-2 py-0.5 rounded font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
                              <Tag className="h-2.5 w-2.5" /> Coupon
                            </span>
                          )}
                          {collegeName && (
                            <span className="text-[10px] px-2 py-0.5 rounded font-medium bg-amber-50 text-amber-800 border border-amber-200">
                              {collegeName}
                            </span>
                          )}
                          {courseName && (
                            <span className="text-[10px] px-2 py-0.5 rounded font-medium bg-blue-50 text-blue-800 border border-blue-200">
                              {courseName}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => handleToggle(item.id)}
                          className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
                        >
                          {item.isActive ? (
                            <>
                              <ToggleRight className="h-5 w-5 text-[#4A7B5B]" />
                              <span className="text-[#4A7B5B]">Active</span>
                            </>
                          ) : (
                            <>
                              <ToggleLeft className="h-5 w-5 text-slate-400" />
                              <span className="text-slate-500">Inactive</span>
                            </>
                          )}
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="p-1.5 text-slate-500 hover:text-[#4A7B5B] hover:bg-[#E8F3EC] rounded-lg transition"
                          title="Edit Fee Structure"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <h2 className="text-lg font-bold text-slate-900">
                {editingId ? 'Edit Fee Structure' : 'Create New Fee Structure'}
              </h2>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Quick canonical templates for new fee */}
            {!editingId && (
              <div className="mb-4 bg-[#F8FAFC] p-3 rounded-xl border border-slate-200">
                <div className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-[#4A7B5B]" /> Quick Predefined Canonical Fee Presets
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {CANONICAL_FEE_CODES.map((t) => (
                    <button
                      key={t.code}
                      type="button"
                      onClick={() => handleSelectPredefined(t)}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium transition ${
                        formData.code === t.code
                          ? 'bg-[#4A7B5B] text-white border-[#4A7B5B]'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {t.code}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Fee Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    disabled={!!editingId}
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
                    placeholder="e.g. STUDY_MATERIAL_FEE"
                    required
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl font-mono uppercase focus:outline-none focus:border-[#4A7B5B] disabled:bg-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Category <span className="text-red-500">*</span>
                  </label>
                  {!isCustomCategory ? (
                    <div className="flex gap-1.5">
                      <select
                        value={formData.category}
                        onChange={(e) => {
                          if (e.target.value === '__CUSTOM__') {
                            setIsCustomCategory(true);
                          } else {
                            setFormData({ ...formData, category: e.target.value });
                          }
                        }}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-[#4A7B5B]"
                      >
                        {categories.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat.replace(/_/g, ' ')}
                          </option>
                        ))}
                        <option value="__CUSTOM__">+ Add Custom Category...</option>
                      </select>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={customCategoryInput}
                        onChange={(e) => setCustomCategoryInput(e.target.value.toUpperCase().replace(/\s+/g, '_'))}
                        placeholder="e.g. SCHOLARSHIP_FEE"
                        required
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl font-mono uppercase focus:outline-none focus:border-[#4A7B5B]"
                      />
                      <button
                        type="button"
                        onClick={() => setIsCustomCategory(false)}
                        className="px-2.5 py-1 text-xs border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-100"
                      >
                        Presets
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Display Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Academic Study Material & Kit Fee"
                  required
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-[#4A7B5B]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Explain what this fee covers, payment terms, or policy rules..."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-[#4A7B5B]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Default Amount (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.defaultAmount}
                    onChange={(e) => setFormData({ ...formData, defaultAmount: Number(e.target.value) })}
                    required
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-[#4A7B5B]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Academic Session</label>
                  <input
                    type="text"
                    value={formData.academicSession}
                    onChange={(e) => setFormData({ ...formData, academicSession: e.target.value })}
                    placeholder="2026-2027"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-[#4A7B5B]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Display Order</label>
                  <input
                    type="number"
                    value={formData.displayOrder}
                    onChange={(e) => setFormData({ ...formData, displayOrder: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-[#4A7B5B]"
                  />
                </div>
              </div>

              {/* Offering Scoping */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    College Specific (Optional)
                  </label>
                  <select
                    value={formData.collegeId || ''}
                    onChange={(e) => setFormData({ ...formData, collegeId: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none"
                  >
                    <option value="">Global (All Colleges)</option>
                    {colleges.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.slug || c.code || 'ID'})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Course Specific (Optional)
                  </label>
                  <select
                    value={formData.courseId || ''}
                    onChange={(e) => setFormData({ ...formData, courseId: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none"
                  >
                    <option value="">Global (All Courses)</option>
                    {courses.map((cr) => (
                      <option key={cr.id} value={cr.id}>
                        {cr.name} ({cr.code || 'ID'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Attribute Checkboxes */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isMandatory}
                    onChange={(e) => setFormData({ ...formData, isMandatory: e.target.checked })}
                    className="rounded text-[#4A7B5B] focus:ring-[#4A7B5B]"
                  />
                  Mandatory Fee
                </label>

                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isRefundable}
                    onChange={(e) => setFormData({ ...formData, isRefundable: e.target.checked })}
                    className="rounded text-[#4A7B5B] focus:ring-[#4A7B5B]"
                  />
                  Refundable Deposit
                </label>

                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isCouponEligible}
                    onChange={(e) => setFormData({ ...formData, isCouponEligible: e.target.checked })}
                    className="rounded text-[#4A7B5B] focus:ring-[#4A7B5B]"
                  />
                  Coupon Eligible
                </label>

                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="rounded text-[#4A7B5B] focus:ring-[#4A7B5B]"
                  />
                  Active Status
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalSubmitting}
                  className="px-5 py-2 bg-[#4A7B5B] hover:bg-[#3D664B] text-white rounded-xl text-xs font-bold shadow transition flex items-center gap-1.5"
                >
                  {modalSubmitting && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                  Save Fee Structure
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Simulator Modal */}
      {showCalcModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-[#4A7B5B]" />
                <h2 className="text-lg font-bold text-slate-900">Fee & Discount Engine Simulator</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowCalcModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Fee Type</label>
                <select
                  value={calcForm.feeTypeCode}
                  onChange={(e) => setCalcForm({ ...calcForm, feeTypeCode: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-[#4A7B5B] font-mono"
                >
                  {fees.map((f) => (
                    <option key={f.code} value={f.code}>
                      {f.name} ({f.code})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Base Amount (₹)</label>
                <input
                  type="number"
                  value={calcForm.customAmount}
                  onChange={(e) => setCalcForm({ ...calcForm, customAmount: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-[#4A7B5B]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Optional Coupon Code</label>
              <input
                type="text"
                placeholder="e.g. WELCOME100 or SCHOLAR50"
                value={calcForm.couponCode}
                onChange={(e) => setCalcForm({ ...calcForm, couponCode: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl font-mono uppercase focus:outline-none focus:border-[#4A7B5B]"
              />
            </div>

            <button
              type="button"
              onClick={handleRunCalculation}
              disabled={calcLoading}
              className="w-full py-2.5 bg-[#4A7B5B] hover:bg-[#3D664B] text-white rounded-xl text-xs font-bold shadow transition flex items-center justify-center gap-2"
            >
              {calcLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Execute Calculation
            </button>

            {calcResult && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5">
                <div className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200 pb-1.5">
                  Calculation Breakdown
                </div>
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Gross Base Amount:</span>
                  <span className="font-semibold text-slate-900">₹{calcResult.grossAmount.toLocaleString()}</span>
                </div>
                {calcResult.referralDiscount > 0 && (
                  <div className="flex justify-between text-xs text-emerald-700 font-medium">
                    <span>Referred Student Counselling Benefit:</span>
                    <span>-₹{calcResult.referralDiscount.toLocaleString()}</span>
                  </div>
                )}
                {calcResult.couponDiscount > 0 && (
                  <div className="flex justify-between text-xs text-indigo-700 font-medium">
                    <span>Coupon Discount:</span>
                    <span>-₹{calcResult.couponDiscount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Total Discount:</span>
                  <span className="font-bold text-emerald-700">₹{calcResult.totalDiscount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-slate-900 border-t border-slate-200 pt-2">
                  <span>Net Payable Amount:</span>
                  <span className={calcResult.payableAmount === 0 ? 'text-[#4A7B5B]' : 'text-slate-900'}>
                    {calcResult.payableAmount === 0 ? 'FREE (₹0)' : `₹${calcResult.payableAmount.toLocaleString()}`}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 bg-white p-2 rounded-lg border border-slate-200">
                  Applied Rule: <strong className="text-slate-800">{calcResult.appliedBenefitType}</strong>
                  {calcResult.stackingApplied ? ' (Stacking Allowed)' : ' (Standard Highest-Discount Rule)'}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
export default FeeManagementPage;
