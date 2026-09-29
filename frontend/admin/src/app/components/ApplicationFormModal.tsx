import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Loader2 } from "lucide-react";
import { applicationsApi } from "../../api/applications.api";
// Assuming there are these APIs or similar, we'll fetch them using basic fetch/axios if needed
import api from "../../api/axios";

export default function ApplicationFormModal({ 
  app, 
  onClose 
}: { 
  app?: any; 
  onClose: () => void 
}) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    userId: app?.user?.id || "",
    collegeId: app?.collegeId || "",
    courseId: app?.courseId || "",
    counselorId: app?.counselorId || "",
    admissionYear: app?.admissionYear || new Date().getFullYear(),
    status: app?.status || "NEW",
    paymentStatus: app?.paymentStatus || "PENDING",
    remarks: app?.remarks || "",
  });

  const { data: studentsRes } = useQuery({
    queryKey: ["admin_users", { role: "STUDENT" }],
    queryFn: () => api.get("/users?role=STUDENT&limit=1000")
  });
  const students = studentsRes?.data?.data || [];

  const { data: collegesRes } = useQuery({
    queryKey: ["admin_colleges"],
    queryFn: () => api.get("/colleges?limit=1000")
  });
  const colleges = collegesRes?.data?.data || [];

  const { data: coursesRes } = useQuery({
    queryKey: ["admin_courses"],
    queryFn: () => api.get("/courses?limit=1000")
  });
  const courses = coursesRes?.data?.data || [];

  const { data: counselorsRes } = useQuery({
    queryKey: ["admin_users", { role: "COUNSELOR" }],
    queryFn: () => api.get("/users?role=COUNSELOR&limit=1000")
  });
  const counselors = counselorsRes?.data?.data || [];

  const mutation = useMutation({
    mutationFn: (data: any) => {
      if (app?.id) {
        return applicationsApi.update(app.id, data);
      } else {
        return api.post("/applications", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_applications"] });
      queryClient.invalidateQueries({ queryKey: ["admin_applications_stats"] });
      onClose();
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-[#F1F5F9]">
          <h2 className="text-lg font-bold text-[#4A7B5B]">{app ? "Edit Application" : "New Application"}</h2>
          <button onClick={onClose} className="p-2 hover:bg-[#F1F5F9] rounded-xl"><X className="w-5 h-5 text-[#64748B]" /></button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {!app && (
            <div>
              <label className="block text-sm font-medium text-[#475569] mb-1">Student *</label>
              <select 
                required 
                value={formData.userId} 
                onChange={e => setFormData({ ...formData, userId: e.target.value })}
                className="w-full h-11 px-3 rounded-xl border border-[#E2E8F0] bg-white text-sm focus:outline-none focus:border-[#4A7B5B]"
              >
                <option value="">Select Student</option>
                {students.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.fullName} ({s.email})</option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#475569] mb-1">College *</label>
              <select 
                required 
                value={formData.collegeId} 
                onChange={e => setFormData({ ...formData, collegeId: e.target.value })}
                className="w-full h-11 px-3 rounded-xl border border-[#E2E8F0] bg-white text-sm focus:outline-none focus:border-[#4A7B5B]"
              >
                <option value="">Select College</option>
                {colleges.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#475569] mb-1">Course *</label>
              <select 
                required 
                value={formData.courseId} 
                onChange={e => setFormData({ ...formData, courseId: e.target.value })}
                className="w-full h-11 px-3 rounded-xl border border-[#E2E8F0] bg-white text-sm focus:outline-none focus:border-[#4A7B5B]"
              >
                <option value="">Select Course</option>
                {courses.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#475569] mb-1">Counselor</label>
              <select 
                value={formData.counselorId} 
                onChange={e => setFormData({ ...formData, counselorId: e.target.value })}
                className="w-full h-11 px-3 rounded-xl border border-[#E2E8F0] bg-white text-sm focus:outline-none focus:border-[#4A7B5B]"
              >
                <option value="">Unassigned</option>
                {counselors.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.fullName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#475569] mb-1">Admission Year</label>
              <input 
                type="number"
                value={formData.admissionYear} 
                onChange={e => setFormData({ ...formData, admissionYear: parseInt(e.target.value) })}
                className="w-full h-11 px-3 rounded-xl border border-[#E2E8F0] bg-white text-sm focus:outline-none focus:border-[#4A7B5B]"
              />
            </div>
          </div>

          {app && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#475569] mb-1">Status</label>
                <select 
                  value={formData.status} 
                  onChange={e => setFormData({ ...formData, status: e.target.value })}
                  className="w-full h-11 px-3 rounded-xl border border-[#E2E8F0] bg-white text-sm focus:outline-none focus:border-[#4A7B5B]"
                >
                  <option value="NEW">Draft</option>
                  <option value="DOCUMENT_PENDING">Submitted</option>
                  <option value="UNDER_REVIEW">Under Review</option>
                  <option value="DOCUMENTS_VERIFIED">Docs Verified</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="ADMISSION_CONFIRMED">Confirmed</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#475569] mb-1">Payment Status</label>
                <select 
                  value={formData.paymentStatus} 
                  onChange={e => setFormData({ ...formData, paymentStatus: e.target.value })}
                  className="w-full h-11 px-3 rounded-xl border border-[#E2E8F0] bg-white text-sm focus:outline-none focus:border-[#4A7B5B]"
                >
                  <option value="PENDING">Pending</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="FAILED">Failed</option>
                </select>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-[#475569] mb-1">Remarks</label>
            <textarea 
              rows={3}
              value={formData.remarks} 
              onChange={e => setFormData({ ...formData, remarks: e.target.value })}
              className="w-full p-3 rounded-xl border border-[#E2E8F0] bg-white text-sm focus:outline-none focus:border-[#4A7B5B]"
              placeholder="Add internal notes..."
            />
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl border border-[#E2E8F0] text-sm font-medium text-[#475569] hover:bg-[#F8FAFC]">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="px-5 py-2.5 rounded-xl bg-[#4A7B5B] text-white text-sm font-medium hover:bg-[#3b664a] disabled:opacity-70 flex items-center gap-2">
              {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Save Application
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
