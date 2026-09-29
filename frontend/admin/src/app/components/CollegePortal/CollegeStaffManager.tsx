import React, { useState, useEffect } from "react";
import {
  Users,
  UserPlus,
  Shield,
  CheckCircle2,
  XCircle,
  Mail,
  Phone,
  X,
} from "lucide-react";
import { collegesApi, CollegeStaff } from "../../../api/colleges.api";

interface CollegeStaffManagerProps {
  collegeId: string;
}

export const CollegeStaffManager: React.FC<CollegeStaffManagerProps> = ({
  collegeId,
}) => {
  const [staffList, setStaffList] = useState<CollegeStaff[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    mobile: "",
    designation: "Admission Officer",
    roleSlug: "college-admission-officer",
    password: "",
  });

  const loadStaff = async () => {
    try {
      setLoading(true);
      const res = await collegesApi.getStaff(collegeId);
      if (res.data.success) {
        setStaffList(res.data.data);
      }
    } catch (err) {
      console.error("Failed to load staff", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (collegeId) {
      loadStaff();
    }
  }, [collegeId]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await collegesApi.inviteStaff(collegeId, formData);
      setModalOpen(false);
      setFormData({
        fullName: "",
        email: "",
        mobile: "",
        designation: "Admission Officer",
        roleSlug: "college-admission-officer",
        password: "",
      });
      loadStaff();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to invite staff");
    }
  };

  const handleToggleStatus = async (staffId: string, currentStatus: boolean) => {
    try {
      await collegesApi.updateStaffStatus(collegeId, staffId, !currentStatus);
      loadStaff();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to update staff status");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#4A7B5B]">
            College Staff & User Access Management
          </h2>
          <p className="text-xs text-[#64748B]">
            Manage institutional officers, role scopes, and operational review permissions.
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="px-4 py-2 text-sm font-semibold bg-[#4A7B5B] text-white hover:bg-[#3D674C] rounded-xl shadow-sm transition flex items-center gap-1.5"
        >
          <UserPlus className="w-4 h-4" /> Add College Staff
        </button>
      </div>

      {/* Staff Listing */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-[#64748B]">Loading staff directory...</div>
        ) : staffList.length === 0 ? (
          <div className="p-12 text-center text-[#64748B] space-y-3">
            <Users className="w-10 h-10 mx-auto text-[#94A3B8]" />
            <p className="font-medium text-[#4A7B5B]">No staff members onboarded yet</p>
            <p className="text-xs">Add officers to manage admission review, reporting, and finance.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Staff Member</th>
                  <th className="py-3.5 px-4">Contact</th>
                  <th className="py-3.5 px-4">Designation</th>
                  <th className="py-3.5 px-4">Assigned Roles</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {staffList.map((staff) => (
                  <tr key={staff.id} className="hover:bg-[#F8FAFC]/70 transition">
                    <td className="py-3.5 px-4 font-semibold text-[#4A7B5B]">
                      {staff.fullName}
                      <div className="text-xs font-normal text-[#64748B]">
                        ID: {staff.id.slice(0, 8)}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-[#64748B] space-y-0.5">
                      <div className="flex items-center gap-1">
                        <Mail className="w-3 h-3 text-[#94A3B8]" /> {staff.email}
                      </div>
                      <div className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-[#94A3B8]" /> {staff.mobile}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-[#4A7B5B]">
                      {staff.designation || "College Operations"}
                    </td>
                    <td className="py-3.5 px-4">
                      {staff.userRoles && staff.userRoles.length > 0 ? (
                        staff.userRoles.map((ur, idx) => (
                          <span
                            key={idx}
                            className="inline-block text-xs bg-[#E8F3EC] text-[#4A7B5B] font-medium px-2 py-0.5 rounded-md mr-1 mb-1 border border-[#4A7B5B]/20"
                          >
                            {ur.role.name}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                          {staff.role}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                          staff.isActive
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}
                      >
                        {staff.isActive ? "Active" : "Suspended"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleToggleStatus(staff.id, staff.isActive)}
                        className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                          staff.isActive
                            ? "bg-rose-50 text-rose-700 hover:bg-rose-100"
                            : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        }`}
                      >
                        {staff.isActive ? "Deactivate" : "Activate"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invite Staff Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#E2E8F0] my-8 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <h3 className="font-bold text-[#4A7B5B] text-lg">
                Onboard Institutional Staff
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-[#64748B] hover:text-[#4A7B5B]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleInvite} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#4A7B5B] mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) =>
                    setFormData({ ...formData, fullName: e.target.value })
                  }
                  placeholder="e.g. Dr. Rajesh Kumar"
                  className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/30"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#4A7B5B] mb-1">
                  Institutional Email *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="rajesh@institution.edu"
                  className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/30"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#4A7B5B] mb-1">
                  Mobile Number *
                </label>
                <input
                  type="text"
                  required
                  value={formData.mobile}
                  onChange={(e) =>
                    setFormData({ ...formData, mobile: e.target.value })
                  }
                  placeholder="10-digit mobile"
                  className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/30"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#4A7B5B] mb-1">
                  Institutional Designation
                </label>
                <input
                  type="text"
                  value={formData.designation}
                  onChange={(e) =>
                    setFormData({ ...formData, designation: e.target.value })
                  }
                  placeholder="e.g. Dean of Admissions / Registrar"
                  className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/30"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#4A7B5B] mb-1">
                  Role & Data Scope
                </label>
                <select
                  value={formData.roleSlug}
                  onChange={(e) =>
                    setFormData({ ...formData, roleSlug: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/30"
                >
                  <option value="college-admin">College Administrator (Full College Access)</option>
                  <option value="college-admission-officer">College Admission Officer (Review & Approve)</option>
                  <option value="college-finance-officer">College Finance Officer (Payments & Fees)</option>
                  <option value="college-reporting-officer">College Reporting Officer (Enrollment)</option>
                  <option value="college-counselor">College Counselor (Student Assistance)</option>
                  <option value="college-viewer">College Read-Only Viewer</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#4A7B5B] mb-1">
                  Initial Temporary Password
                </label>
                <input
                  type="text"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  placeholder="Default: College@123"
                  className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/30"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-[#64748B] hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold bg-[#4A7B5B] text-white hover:bg-[#3D674C] rounded-xl shadow-sm"
                >
                  Create & Onboard
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
