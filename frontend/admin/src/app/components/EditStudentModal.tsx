import { useState, useEffect } from "react";
import { X, Save, User, BookOpen, Heart, Shield, CheckCircle } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usersApi } from "../../api/users.api";

interface EditStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: any;
}

export function EditStudentModal({ isOpen, onClose, student }: EditStudentModalProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("personal");
  const [formData, setFormData] = useState<any>({});

  // Fetch counselors for assignment
  const { data: counselorsRes } = useQuery({
    queryKey: ["admin_counselors"],
    queryFn: () => usersApi.getAll({ role: "COUNSELOR", limit: 100 }),
    enabled: isOpen
  });
  const counselors = counselorsRes?.data?.data || [];

  useEffect(() => {
    if (student && isOpen) {
      setFormData({
        fullName: student.fullName || "",
        email: student.email || "",
        mobile: student.mobile || "",
        isApproved: student.isApproved ?? true,
        // Profile
        dob: student.profile?.dob ? new Date(student.profile.dob).toISOString().split('T')[0] : "",
        gender: student.profile?.gender || "",
        category: student.profile?.category || "",
        address: student.profile?.address || "",
        city: student.profile?.city || "",
        state: student.profile?.state || "",
        pincode: student.profile?.pincode || "",
        // Academic
        tenthBoard: student.profile?.tenthBoard || "",
        tenthPassingYear: student.profile?.tenthPassingYear || "",
        tenthMarks: student.profile?.tenthMarks || "",
        twelfthBoard: student.profile?.twelfthBoard || "",
        twelfthPassingYear: student.profile?.twelfthPassingYear || "",
        twelfthMarks: student.profile?.twelfthMarks || "",
        graduationCourse: student.profile?.graduationCourse || "",
        graduationPercentage: student.profile?.graduationPercentage || "",
        // Preferences
        stream: student.studentPreference?.stream || "OTHER",
        collegeType: student.studentPreference?.collegeType || "",
        budgetMax: student.studentPreference?.budgetMax || "",
        // Counselor
        counselorId: student.lead?.assignedCounselor?.id || ""
      });
    }
  }, [student, isOpen]);

  const updateMutation = useMutation({
    mutationFn: (data: any) => usersApi.updateStudent(student.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_students"] });
      queryClient.invalidateQueries({ queryKey: ["admin_student_detail", student.id] });
      onClose();
    }
  });

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleToggle = (name: string) => {
    setFormData((prev: any) => ({ ...prev, [name]: !prev[name] }));
  };

  const handleSubmit = () => {
    const payload = { ...formData };
    // Numeric conversions
    if (payload.tenthMarks) payload.tenthMarks = parseFloat(payload.tenthMarks);
    if (payload.twelfthMarks) payload.twelfthMarks = parseFloat(payload.twelfthMarks);
    if (payload.graduationPercentage) payload.graduationPercentage = parseFloat(payload.graduationPercentage);
    if (payload.budgetMax) payload.budgetMax = parseFloat(payload.budgetMax);

    updateMutation.mutate(payload);
  };

  const tabs = [
    { id: "personal", label: "Personal", icon: User },
    { id: "academic", label: "Academic", icon: BookOpen },
    { id: "preferences", label: "Preferences", icon: Heart },
    { id: "counselor", label: "Assignment", icon: Shield },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-xl flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-[#F1F5F9] flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-[#1E293B]">Edit Student</h2>
            <p className="text-sm text-[#64748B] mt-1">Update information for {student?.fullName}</p>
          </div>
          <button onClick={onClose} className="p-2 text-[#64748B] hover:bg-[#F8FAFC] rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex border-b border-[#F1F5F9] px-6">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id ? "border-[#4A7B5B] text-[#4A7B5B]" : "border-transparent text-[#64748B] hover:text-[#1E293B]"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6 overflow-y-auto flex-1 bg-[#F8FAFC]">
          {activeTab === "personal" && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[#1E293B]">Full Name</label>
                  <input name="fullName" value={formData.fullName} onChange={handleChange} className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] focus:ring-2 focus:ring-[#4A7B5B]/20 focus:border-[#4A7B5B] outline-none text-sm" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[#1E293B]">Email</label>
                  <input name="email" value={formData.email} onChange={handleChange} className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] focus:ring-2 focus:ring-[#4A7B5B]/20 focus:border-[#4A7B5B] outline-none text-sm" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[#1E293B]">Mobile</label>
                  <input name="mobile" value={formData.mobile} onChange={handleChange} className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] focus:ring-2 focus:ring-[#4A7B5B]/20 focus:border-[#4A7B5B] outline-none text-sm" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[#1E293B]">Date of Birth</label>
                  <input type="date" name="dob" value={formData.dob} onChange={handleChange} className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] focus:ring-2 focus:ring-[#4A7B5B]/20 focus:border-[#4A7B5B] outline-none text-sm" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[#1E293B]">Gender</label>
                  <select name="gender" value={formData.gender} onChange={handleChange} className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] focus:ring-2 focus:ring-[#4A7B5B]/20 focus:border-[#4A7B5B] outline-none text-sm bg-white">
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[#1E293B]">Category</label>
                  <input name="category" value={formData.category} onChange={handleChange} className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] focus:ring-2 focus:ring-[#4A7B5B]/20 focus:border-[#4A7B5B] outline-none text-sm" />
                </div>
              </div>
              
              <div className="p-4 bg-white rounded-xl border border-[#E2E8F0]">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={formData.isApproved} onChange={() => handleToggle('isApproved')} className="w-5 h-5 rounded border-[#E2E8F0] text-[#4A7B5B] focus:ring-[#4A7B5B]" />
                  <div>
                    <span className="text-sm font-medium text-[#1E293B] block">Account Approved</span>
                    <span className="text-xs text-[#64748B]">Allow student to access the portal and services</span>
                  </div>
                </label>
              </div>
            </div>
          )}

          {activeTab === "academic" && (
            <div className="space-y-6">
              <h3 className="font-semibold text-[#1E293B]">10th Standard</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[#1E293B]">Board</label>
                  <input name="tenthBoard" value={formData.tenthBoard} onChange={handleChange} className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] focus:ring-2 focus:ring-[#4A7B5B]/20 focus:border-[#4A7B5B] outline-none text-sm" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[#1E293B]">Percentage / CGPA</label>
                  <input type="number" name="tenthMarks" value={formData.tenthMarks} onChange={handleChange} className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] focus:ring-2 focus:ring-[#4A7B5B]/20 focus:border-[#4A7B5B] outline-none text-sm" />
                </div>
              </div>
              <h3 className="font-semibold text-[#1E293B] mt-6">12th Standard</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[#1E293B]">Board</label>
                  <input name="twelfthBoard" value={formData.twelfthBoard} onChange={handleChange} className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] focus:ring-2 focus:ring-[#4A7B5B]/20 focus:border-[#4A7B5B] outline-none text-sm" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[#1E293B]">Percentage / CGPA</label>
                  <input type="number" name="twelfthMarks" value={formData.twelfthMarks} onChange={handleChange} className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] focus:ring-2 focus:ring-[#4A7B5B]/20 focus:border-[#4A7B5B] outline-none text-sm" />
                </div>
              </div>
            </div>
          )}

          {activeTab === "preferences" && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[#1E293B]">Preferred Stream</label>
                  <select name="stream" value={formData.stream} onChange={handleChange} className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] focus:ring-2 focus:ring-[#4A7B5B]/20 focus:border-[#4A7B5B] outline-none text-sm bg-white">
                    <option value="SCIENCE">Science</option>
                    <option value="COMMERCE">Commerce</option>
                    <option value="ARTS">Arts</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[#1E293B]">College Type</label>
                  <select name="collegeType" value={formData.collegeType} onChange={handleChange} className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] focus:ring-2 focus:ring-[#4A7B5B]/20 focus:border-[#4A7B5B] outline-none text-sm bg-white">
                    <option value="">Any</option>
                    <option value="GOVERNMENT">Government</option>
                    <option value="PRIVATE">Private</option>
                    <option value="DEEMED">Deemed</option>
                  </select>
                </div>
                <div className="space-y-1.5 col-span-2">
                  <label className="text-sm font-medium text-[#1E293B]">Max Budget (Total)</label>
                  <input type="number" name="budgetMax" value={formData.budgetMax} onChange={handleChange} className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] focus:ring-2 focus:ring-[#4A7B5B]/20 focus:border-[#4A7B5B] outline-none text-sm" />
                </div>
              </div>
            </div>
          )}

          {activeTab === "counselor" && (
            <div className="space-y-6">
              <div className="p-4 bg-white rounded-xl border border-[#E2E8F0] mb-4 flex gap-3 items-start">
                <Shield className="w-5 h-5 text-[#4A7B5B] mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-[#1E293B]">Assign a Counselor</h4>
                  <p className="text-xs text-[#64748B] mt-1">Assigning a counselor here will also update the assigned Lead for this student, enabling them to chat and see guidance.</p>
                </div>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[#1E293B]">Select Counselor</label>
                <select name="counselorId" value={formData.counselorId} onChange={handleChange} className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] focus:ring-2 focus:ring-[#4A7B5B]/20 focus:border-[#4A7B5B] outline-none text-sm bg-white">
                  <option value="">Unassigned</option>
                  {counselors.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.fullName} ({c.email})</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-[#F1F5F9] flex justify-end gap-3 flex-shrink-0 bg-white rounded-b-2xl">
          <button onClick={onClose} className="px-5 py-2.5 text-sm font-medium text-[#64748B] hover:text-[#1E293B] hover:bg-[#F8FAFC] rounded-xl transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={updateMutation.isPending}
            className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-[#4A7B5B] hover:bg-[#3d664b] rounded-xl transition-colors disabled:opacity-50"
          >
            {updateMutation.isPending ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
