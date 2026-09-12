import React, { useState, useEffect } from "react";
import {
  Layers,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Lock,
  Edit2,
  Send,
  AlertCircle,
  X,
  IndianRupee,
  Users,
} from "lucide-react";
import {
  offeringsApi,
  CollegeOffering,
} from "../../../api/offerings.api";
import api from "../../../api/axios";

interface OfferingsManagerProps {
  collegeId: string;
}

export const OfferingsManager: React.FC<OfferingsManagerProps> = ({ collegeId }) => {
  const [offerings, setOfferings] = useState<CollegeOffering[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedSession, setSelectedSession] = useState("2026-27");
  const [statusFilter, setStatusFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingOffering, setEditingOffering] = useState<CollegeOffering | null>(null);

  // Available courses and branches from central catalog
  const [coursesList, setCoursesList] = useState<any[]>([]);
  const [branchesList, setBranchesList] = useState<any[]>([]);

  // Form State
  const [formData, setFormData] = useState({
    courseId: "",
    branchId: "",
    academicSession: "2026-27",
    totalSeats: 60,
    reservedSeats: 0,
    tuitionFee: 75000,
    admissionFee: 5000,
    examFee: 3000,
    hostelFee: 40000,
    transportFee: 15000,
    otherCharges: 2000,
    eligibilityCriteria: "10+2 with minimum 50% aggregate in PCM/PCB.",
    minPercentage: 50,
  });

  const loadOfferings = async () => {
    try {
      setLoading(true);
      const res = await offeringsApi.findOfferings({
        collegeId,
        academicSession: selectedSession || undefined,
        status: statusFilter || undefined,
        search: search || undefined,
      });
      if (res.data.success) {
        setOfferings(res.data.data);
      }
    } catch (err) {
      console.error("Failed to load offerings", err);
    } finally {
      setLoading(false);
    }
  };

  const loadCentralCatalog = async () => {
    try {
      const res = await api.get("/courses", { params: { limit: 100 } });
      if (res.data) {
        setCoursesList(res.data.data || res.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch courses catalog", err);
    }
  };

  useEffect(() => {
    if (collegeId) {
      loadOfferings();
      loadCentralCatalog();
    }
  }, [collegeId, selectedSession, statusFilter]);

  const handleCourseChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const cid = e.target.value;
    setFormData((prev) => ({ ...prev, courseId: cid, branchId: "" }));
    const selectedCourse = coursesList.find((c) => c.id === cid);
    if (selectedCourse && selectedCourse.branches) {
      setBranchesList(selectedCourse.branches);
    } else {
      setBranchesList([]);
    }
  };

  const handleSaveOffering = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingOffering) {
        await offeringsApi.update(editingOffering.id, {
          ...formData,
          changeReason: "Institutional offering update",
        });
      } else {
        await offeringsApi.create({
          collegeId,
          ...formData,
        });
      }
      setModalOpen(false);
      setEditingOffering(null);
      loadOfferings();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to save offering");
    }
  };

  const handleSubmitApproval = async (id: string) => {
    try {
      await offeringsApi.submit(id);
      loadOfferings();
    } catch (err: any) {
      alert(err.response?.data?.message || "Submission failed");
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await offeringsApi.approve(id);
      loadOfferings();
    } catch (err: any) {
      alert(err.response?.data?.message || "Approval failed");
    }
  };

  const handleCloseIntake = async (id: string) => {
    if (!confirm("Are you sure you want to close application intake for this offering?")) return;
    try {
      await offeringsApi.close(id);
      loadOfferings();
    } catch (err: any) {
      alert(err.response?.data?.message || "Closure failed");
    }
  };

  const calculateTotalFee = () => {
    return (
      (formData.tuitionFee || 0) +
      (formData.admissionFee || 0) +
      (formData.examFee || 0) +
      (formData.hostelFee || 0) +
      (formData.transportFee || 0) +
      (formData.otherCharges || 0)
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#0F172A]">
            College Academic Program Offerings
          </h2>
          <p className="text-xs text-[#64748B]">
            Configure session-specific program offerings, seat allocations, and componentized fees.
          </p>
        </div>

        <button
          onClick={() => {
            setEditingOffering(null);
            setModalOpen(true);
          }}
          className="px-4 py-2 text-sm font-semibold bg-[#4A7B5B] text-white hover:bg-[#3D674C] rounded-xl shadow-sm transition flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> Create New Offering
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search offering or branch..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadOfferings()}
              className="w-full pl-9 pr-3 py-2 text-sm border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/30"
            />
          </div>

          <select
            value={selectedSession}
            onChange={(e) => setSelectedSession(e.target.value)}
            className="px-3 py-2 text-sm border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/30 bg-white font-medium text-[#0F172A]"
          >
            <option value="2026-27">Session 2026-27</option>
            <option value="2025-26">Session 2025-26</option>
            <option value="2024-25">Session 2024-25</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/30 bg-white text-[#64748B]"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active (Live)</option>
            <option value="PENDING_APPROVAL">Pending Approval</option>
            <option value="DRAFT">Draft</option>
            <option value="FULL">Seat Full</option>
            <option value="CLOSED">Intake Closed</option>
          </select>
        </div>
      </div>

      {/* Offerings Table */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-[#64748B]">Loading program offerings...</div>
        ) : offerings.length === 0 ? (
          <div className="p-12 text-center text-[#64748B] space-y-3">
            <Layers className="w-10 h-10 mx-auto text-[#94A3B8]" />
            <p className="font-medium text-[#0F172A]">No academic offerings found</p>
            <p className="text-xs">Create your first course offering for session {selectedSession}.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Program / Course</th>
                  <th className="py-3.5 px-4">Branch / Specialization</th>
                  <th className="py-3.5 px-4">Academic Session</th>
                  <th className="py-3.5 px-4">Seat Accounting</th>
                  <th className="py-3.5 px-4">Annual Fee</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {offerings.map((offering) => (
                  <tr key={offering.id} className="hover:bg-[#F8FAFC]/70 transition">
                    <td className="py-3.5 px-4 font-semibold text-[#0F172A]">
                      {offering.course?.name || "Unassigned Course"}
                      <div className="text-xs font-normal text-[#64748B]">
                        Level: {offering.course?.level || "N/A"}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-[#0F172A]">
                      {offering.branch?.name || "General / Core"}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-[#64748B]">
                      {offering.academicSession}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-emerald-700">
                          {offering.availableSeats}
                        </span>
                        <span className="text-xs text-[#64748B]">avail of</span>
                        <span className="font-semibold text-[#0F172A]">
                          {offering.totalSeats}
                        </span>
                      </div>
                      <div className="text-xs text-[#64748B]">
                        Consumed: {offering.consumedSeats} | Res: {offering.reservedSeats}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-[#0F172A]">
                      ₹{offering.totalFee.toLocaleString("en-IN")}
                      <div className="text-xs font-normal text-[#64748B]">
                        Tuition: ₹{offering.tuitionFee.toLocaleString("en-IN")}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                          offering.status === "ACTIVE"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : offering.status === "PENDING_APPROVAL"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : offering.status === "DRAFT"
                            ? "bg-slate-100 text-slate-700 border border-slate-200"
                            : offering.status === "FULL"
                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {offering.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-1.5">
                      {offering.status === "DRAFT" && (
                        <button
                          onClick={() => handleSubmitApproval(offering.id)}
                          className="px-2.5 py-1 text-xs font-semibold bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg transition"
                          title="Submit for Approval"
                        >
                          <Send className="w-3.5 h-3.5 inline mr-1" /> Submit
                        </button>
                      )}

                      {offering.status === "PENDING_APPROVAL" && (
                        <button
                          onClick={() => handleApprove(offering.id)}
                          className="px-2.5 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg transition"
                          title="Admin Approve Offering"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" /> Approve
                        </button>
                      )}

                      {offering.status === "ACTIVE" && (
                        <button
                          onClick={() => handleCloseIntake(offering.id)}
                          className="px-2.5 py-1 text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg transition"
                          title="Close Intake"
                        >
                          <Lock className="w-3.5 h-3.5 inline mr-1" /> Close
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setEditingOffering(offering);
                          setFormData({
                            courseId: offering.courseId,
                            branchId: offering.branchId || "",
                            academicSession: offering.academicSession,
                            totalSeats: offering.totalSeats,
                            reservedSeats: offering.reservedSeats,
                            tuitionFee: offering.tuitionFee,
                            admissionFee: offering.admissionFee,
                            examFee: offering.examFee,
                            hostelFee: offering.hostelFee,
                            transportFee: offering.transportFee,
                            otherCharges: offering.otherCharges,
                            eligibilityCriteria: offering.eligibilityCriteria || "",
                            minPercentage: offering.minPercentage || 50,
                          });
                          setModalOpen(true);
                        }}
                        className="px-2.5 py-1 text-xs font-medium text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] rounded-lg transition"
                      >
                        <Edit2 className="w-3.5 h-3.5 inline" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-[#E2E8F0] my-8">
            <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0]">
              <h3 className="font-bold text-[#0F172A] text-lg">
                {editingOffering ? "Edit Program Offering" : "Create Academic Offering"}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-[#64748B] hover:text-[#0F172A]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveOffering} className="space-y-4 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                    Central Course Catalog *
                  </label>
                  <select
                    required
                    disabled={!!editingOffering}
                    value={formData.courseId}
                    onChange={handleCourseChange}
                    className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/30 disabled:bg-slate-100"
                  >
                    <option value="">Select Catalog Course</option>
                    {coursesList.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.level || "General"})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                    Branch / Specialization
                  </label>
                  <select
                    disabled={!!editingOffering}
                    value={formData.branchId}
                    onChange={(e) =>
                      setFormData({ ...formData, branchId: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/30 disabled:bg-slate-100"
                  >
                    <option value="">Core / All Branches</option>
                    {branchesList.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.code || "Branch"})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                    Academic Session *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.academicSession}
                    onChange={(e) =>
                      setFormData({ ...formData, academicSession: e.target.value })
                    }
                    placeholder="e.g. 2026-27"
                    className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/30"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                      Total Seats *
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={formData.totalSeats}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          totalSeats: parseInt(e.target.value, 10) || 0,
                        })
                      }
                      className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/30"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                      Reserved Seats
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.reservedSeats}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          reservedSeats: parseInt(e.target.value, 10) || 0,
                        })
                      }
                      className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/30"
                    />
                  </div>
                </div>
              </div>

              {/* Componentized Fees Breakdown */}
              <div className="border-t border-[#E2E8F0] pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                    Componentized Fee Structure (Annual)
                  </h4>
                  <span className="text-sm font-bold text-[#4A7B5B]">
                    Total: ₹{calculateTotalFee().toLocaleString("en-IN")}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-[#64748B] mb-1">Tuition Fee (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.tuitionFee}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          tuitionFee: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3 py-1.5 text-sm border border-[#E2E8F0] rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#64748B] mb-1">Admission Fee (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.admissionFee}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          admissionFee: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3 py-1.5 text-sm border border-[#E2E8F0] rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#64748B] mb-1">Exam Fee (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.examFee}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          examFee: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3 py-1.5 text-sm border border-[#E2E8F0] rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#64748B] mb-1">Hostel Fee (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.hostelFee}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          hostelFee: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3 py-1.5 text-sm border border-[#E2E8F0] rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#64748B] mb-1">Transport Fee (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.transportFee}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          transportFee: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3 py-1.5 text-sm border border-[#E2E8F0] rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#64748B] mb-1">Other Charges (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.otherCharges}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          otherCharges: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3 py-1.5 text-sm border border-[#E2E8F0] rounded-lg"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                  Eligibility Criteria
                </label>
                <textarea
                  rows={2}
                  value={formData.eligibilityCriteria}
                  onChange={(e) =>
                    setFormData({ ...formData, eligibilityCriteria: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/30"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-[#E2E8F0]">
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
                  {editingOffering ? "Update Offering" : "Create Offering"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
