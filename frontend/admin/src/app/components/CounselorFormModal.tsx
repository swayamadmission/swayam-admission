import { useState, useEffect } from "react";
import { counselorsApi } from "../../api/counselors.api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { X } from "lucide-react";

interface CounselorFormModalProps {
  mode: "create" | "edit";
  initialData?: any;
  onClose: () => void;
}

export default function CounselorFormModal({ mode, initialData, onClose }: CounselorFormModalProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"basic" | "org" | "financial" | "notes">("basic");
  
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    mobile: "",
    password: "",
    employeeId: "",
    department: "Admissions",
    designation: "Educational Counselor",
    experience: "3 Years",
    qualification: "MBA",
    gender: "Male",
    dob: "",
    address: "",
    state: "Delhi",
    district: "New Delhi",
    pincode: "110001",
    assignedRegion: "North Region",
    assignedStates: "Delhi, Uttar Pradesh, Haryana",
    assignedCategories: "ENGINEERING, MANAGEMENT",
    commissionRate: 5.0,
    salary: 45000,
    incentives: 7500,
    notes: "",
    isApproved: true,
    employmentStatus: "ACTIVE",
  });

  const [error, setError] = useState("");

  useEffect(() => {
    if (mode === "edit" && initialData) {
      const orig = initialData.originalData || initialData;
      const prof = orig.counselorProfile || {};
      setFormData({
        fullName: orig.fullName || initialData.name || "",
        email: orig.email || initialData.email || "",
        mobile: orig.mobile || initialData.phone || "",
        password: "",
        employeeId: prof.employeeId || orig.employeeId || "",
        department: prof.department || orig.department || "Admissions",
        designation: prof.designation || orig.designation || "Senior Counselor",
        experience: prof.experience || orig.experience || "4 Years",
        qualification: prof.qualification || orig.qualification || "MBA",
        gender: prof.gender || orig.gender || "Male",
        dob: prof.dateOfBirth ? new Date(prof.dateOfBirth).toISOString().split("T")[0] : "",
        address: prof.address || orig.address || "",
        state: prof.state || orig.state || "Delhi",
        district: prof.district || orig.city || "New Delhi",
        pincode: prof.pincode || orig.pincode || "110001",
        assignedRegion: prof.assignedRegion || "North Region",
        assignedStates: Array.isArray(prof.assignedStates) ? prof.assignedStates.join(", ") : prof.assignedStates || "Delhi, Uttar Pradesh",
        assignedCategories: Array.isArray(prof.assignedCategories) ? prof.assignedCategories.join(", ") : prof.assignedCategories || "ENGINEERING, MANAGEMENT",
        commissionRate: prof.commissionRate || 5.0,
        salary: prof.salary || 45000,
        incentives: prof.incentives || 7500,
        notes: prof.notes || "",
        isApproved: orig.isApproved !== undefined ? orig.isApproved : initialData.status === "active",
        employmentStatus: prof.employmentStatus || orig.status || "ACTIVE",
      });
    }
  }, [mode, initialData]);

  const mutation = useMutation({
    mutationFn: (data: any) => {
      if (mode === "create") {
        return counselorsApi.create(data);
      }
      return counselorsApi.update(initialData.id || initialData.originalData?.id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_counselors"] });
      queryClient.invalidateQueries({ queryKey: ["admin_counselor_stats"] });
      queryClient.invalidateQueries({ queryKey: ["counselor_details"] });
      toast.success(mode === "create" ? "Counselor created successfully" : "Counselor updated successfully");
      onClose();
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message;
      let errorText = "Something went wrong. Please try again.";
      if (Array.isArray(msg) && msg.length > 0) errorText = msg[0];
      else if (typeof msg === "string") errorText = msg;
      else if (err.response?.data?.error) errorText = err.response.data.error;
      setError(errorText);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const statesArr = typeof formData.assignedStates === "string"
      ? formData.assignedStates.split(",").map(s => s.trim()).filter(Boolean)
      : formData.assignedStates;

    const catsArr = typeof formData.assignedCategories === "string"
      ? formData.assignedCategories.split(",").map(c => c.trim()).filter(Boolean)
      : formData.assignedCategories;

    const payload: any = {
      ...formData,
      assignedStates: statesArr,
      assignedCategories: catsArr,
      commissionRate: Number(formData.commissionRate),
      salary: Number(formData.salary),
      incentives: Number(formData.incentives),
    };

    if (mode === "edit" && !payload.password) {
      delete payload.password;
    }

    mutation.mutate(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-[#F1F5F9] flex justify-between items-center bg-[#F8FAFC]">
          <div>
            <h2 className="text-lg font-semibold text-[#0F172A]">
              {mode === "create" ? "Add New Counselor" : "Edit Counselor Profile"}
            </h2>
            <p className="text-xs text-[#94A3B8]">Configure counselor details, organization role, and compensation</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-[#94A3B8] hover:text-[#0F172A] hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-[#F1F5F9] px-5 bg-white gap-4 text-xs font-medium text-[#64748B]">
          {[
            { id: "basic", label: "Personal & Account" },
            { id: "org", label: "Organization & Region" },
            { id: "financial", label: "Financial & Commission" },
            { id: "notes", label: "Notes & Status" },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-3 border-b-2 transition-all ${
                activeTab === tab.id
                  ? "border-[#4A7B5B] text-[#4A7B5B] font-semibold"
                  : "border-transparent hover:text-[#0F172A]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {error && <div className="mx-6 mt-4 text-red-600 bg-red-50 p-3 rounded-xl text-xs">{error}</div>}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {activeTab === "basic" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#475569] mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  className="w-full h-9 px-3 rounded-xl border border-[#E2E8F0] text-sm focus:outline-none focus:border-[#4A7B5B]"
                  value={formData.fullName}
                  onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#475569] mb-1">Employee ID</label>
                <input
                  type="text"
                  placeholder="e.g. EMP-1005"
                  className="w-full h-9 px-3 rounded-xl border border-[#E2E8F0] text-sm focus:outline-none focus:border-[#4A7B5B]"
                  value={formData.employeeId}
                  onChange={e => setFormData({ ...formData, employeeId: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#475569] mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  className="w-full h-9 px-3 rounded-xl border border-[#E2E8F0] text-sm focus:outline-none focus:border-[#4A7B5B]"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#475569] mb-1">Mobile Number *</label>
                <input
                  type="text"
                  required
                  className="w-full h-9 px-3 rounded-xl border border-[#E2E8F0] text-sm focus:outline-none focus:border-[#4A7B5B]"
                  value={formData.mobile}
                  onChange={e => setFormData({ ...formData, mobile: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#475569] mb-1">
                  Password {mode === "edit" && <span className="text-[10px] text-gray-400">(leave blank to keep current)</span>}
                </label>
                <input
                  type="password"
                  required={mode === "create"}
                  minLength={6}
                  className="w-full h-9 px-3 rounded-xl border border-[#E2E8F0] text-sm focus:outline-none focus:border-[#4A7B5B]"
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#475569] mb-1">Gender</label>
                <select
                  className="w-full h-9 px-3 rounded-xl border border-[#E2E8F0] text-sm focus:outline-none focus:border-[#4A7B5B]"
                  value={formData.gender}
                  onChange={e => setFormData({ ...formData, gender: e.target.value })}
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#475569] mb-1">Date of Birth</label>
                <input
                  type="date"
                  className="w-full h-9 px-3 rounded-xl border border-[#E2E8F0] text-sm focus:outline-none focus:border-[#4A7B5B]"
                  value={formData.dob}
                  onChange={e => setFormData({ ...formData, dob: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#475569] mb-1">Qualification</label>
                <input
                  type="text"
                  placeholder="e.g. MBA, B.Tech"
                  className="w-full h-9 px-3 rounded-xl border border-[#E2E8F0] text-sm focus:outline-none focus:border-[#4A7B5B]"
                  value={formData.qualification}
                  onChange={e => setFormData({ ...formData, qualification: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-[#475569] mb-1">Address</label>
                <input
                  type="text"
                  placeholder="Street, Landmark, District, Pincode"
                  className="w-full h-9 px-3 rounded-xl border border-[#E2E8F0] text-sm focus:outline-none focus:border-[#4A7B5B]"
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
            </div>
          )}

          {activeTab === "org" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#475569] mb-1">Department</label>
                <input
                  type="text"
                  className="w-full h-9 px-3 rounded-xl border border-[#E2E8F0] text-sm focus:outline-none focus:border-[#4A7B5B]"
                  value={formData.department}
                  onChange={e => setFormData({ ...formData, department: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#475569] mb-1">Designation</label>
                <input
                  type="text"
                  className="w-full h-9 px-3 rounded-xl border border-[#E2E8F0] text-sm focus:outline-none focus:border-[#4A7B5B]"
                  value={formData.designation}
                  onChange={e => setFormData({ ...formData, designation: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#475569] mb-1">Experience</label>
                <input
                  type="text"
                  placeholder="e.g. 5 Years"
                  className="w-full h-9 px-3 rounded-xl border border-[#E2E8F0] text-sm focus:outline-none focus:border-[#4A7B5B]"
                  value={formData.experience}
                  onChange={e => setFormData({ ...formData, experience: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#475569] mb-1">Assigned Region</label>
                <input
                  type="text"
                  placeholder="e.g. North Region"
                  className="w-full h-9 px-3 rounded-xl border border-[#E2E8F0] text-sm focus:outline-none focus:border-[#4A7B5B]"
                  value={formData.assignedRegion}
                  onChange={e => setFormData({ ...formData, assignedRegion: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-[#475569] mb-1">Assigned States (Comma-separated)</label>
                <input
                  type="text"
                  placeholder="Delhi, Haryana, Uttar Pradesh"
                  className="w-full h-9 px-3 rounded-xl border border-[#E2E8F0] text-sm focus:outline-none focus:border-[#4A7B5B]"
                  value={formData.assignedStates}
                  onChange={e => setFormData({ ...formData, assignedStates: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-[#475569] mb-1">Assigned Course Categories</label>
                <input
                  type="text"
                  placeholder="ENGINEERING, MANAGEMENT, MEDICAL"
                  className="w-full h-9 px-3 rounded-xl border border-[#E2E8F0] text-sm focus:outline-none focus:border-[#4A7B5B]"
                  value={formData.assignedCategories}
                  onChange={e => setFormData({ ...formData, assignedCategories: e.target.value })}
                />
              </div>
            </div>
          )}

          {activeTab === "financial" && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#475569] mb-1">Commission Rate (%)</label>
                <input
                  type="number"
                  step="0.1"
                  className="w-full h-9 px-3 rounded-xl border border-[#E2E8F0] text-sm focus:outline-none focus:border-[#4A7B5B]"
                  value={formData.commissionRate}
                  onChange={e => setFormData({ ...formData, commissionRate: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#475569] mb-1">Base Salary (₹)</label>
                <input
                  type="number"
                  className="w-full h-9 px-3 rounded-xl border border-[#E2E8F0] text-sm focus:outline-none focus:border-[#4A7B5B]"
                  value={formData.salary}
                  onChange={e => setFormData({ ...formData, salary: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#475569] mb-1">Monthly Incentives (₹)</label>
                <input
                  type="number"
                  className="w-full h-9 px-3 rounded-xl border border-[#E2E8F0] text-sm focus:outline-none focus:border-[#4A7B5B]"
                  value={formData.incentives}
                  onChange={e => setFormData({ ...formData, incentives: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
          )}

          {activeTab === "notes" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#475569] mb-1">Employment Status</label>
                <select
                  className="w-full h-9 px-3 rounded-xl border border-[#E2E8F0] text-sm focus:outline-none focus:border-[#4A7B5B]"
                  value={formData.employmentStatus}
                  onChange={e => setFormData({ ...formData, employmentStatus: e.target.value })}
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="SUSPENDED">SUSPENDED</option>
                  <option value="DEACTIVATED">DEACTIVATED</option>
                  <option value="ON_LEAVE">ON LEAVE</option>
                </select>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isApproved"
                  checked={formData.isApproved}
                  onChange={e => setFormData({ ...formData, isApproved: e.target.checked })}
                  className="w-4 h-4 text-[#4A7B5B] rounded"
                />
                <label htmlFor="isApproved" className="text-xs text-[#475569]">
                  Enable Account Access (Active in System)
                </label>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#475569] mb-1">Internal Notes & Special Instructions</label>
                <textarea
                  rows={4}
                  placeholder="Enter remarks, specialized skills, or assigned targets..."
                  className="w-full p-3 rounded-xl border border-[#E2E8F0] text-sm focus:outline-none focus:border-[#4A7B5B]"
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-4 border-t border-[#F1F5F9]">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-10 rounded-xl border border-[#E2E8F0] text-[#475569] text-sm font-medium hover:bg-gray-50 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex-1 h-10 rounded-xl text-white text-sm font-medium flex items-center justify-center transition-all disabled:opacity-50"
              style={{ background: "#4A7B5B" }}
            >
              {mutation.isPending ? "Saving..." : "Save Counselor"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
