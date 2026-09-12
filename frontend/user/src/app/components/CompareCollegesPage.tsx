import React, { useEffect, useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router";
import { collegesApi } from "../../api/colleges.api";
import { counselingApi } from "../../api/counseling.api";
import { ArrowLeft, CheckCircle2, XCircle, Sparkles, Send } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export default function CompareCollegesPage() {
  const [searchParams] = useSearchParams();
  const ids = searchParams.get("ids")?.split(",") || [];
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  
  const [colleges, setColleges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (ids.length > 0) {
      collegesApi.compare(ids).then((res) => {
        setColleges(res.data);
        setLoading(false);
      }).catch(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [ids.join(',')]);

  const handleShortlistOffering = async (collegeId: string, courseId: string, branchId?: string) => {
    if (!isLoggedIn) {
      navigate("/login");
      return;
    }
    setActionLoading(`${collegeId}-${courseId}`);
    try {
      await counselingApi.addToShortlist({
        collegeId,
        courseId,
        branchId,
        academicSession: "2026-2027",
      });
      setSuccessMsg("Program offering shortlisted successfully!");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      alert(err?.response?.data?.message || "Failed to shortlist program");
    } finally {
      setActionLoading(null);
    }
  };

  const handleApplyOffering = async (collegeId: string, courseId: string, branchId?: string) => {
    if (!isLoggedIn) {
      navigate("/login");
      return;
    }
    setActionLoading(`apply-${collegeId}-${courseId}`);
    try {
      const res = await counselingApi.initiateApplication({
        collegeId,
        courseId,
        branchId,
        academicSession: "2026-2027",
        studentChoiceConfirmed: true,
      });
      setSuccessMsg(res.data.isExisting ? "Found existing active application draft!" : "Application draft created successfully!");
      setTimeout(() => navigate("/dashboard?tab=applications"), 1500);
    } catch (err: any) {
      alert(err?.response?.data?.message || "Failed to initiate application");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) return <div className="p-20 text-center text-gray-500">Loading comparison...</div>;
  if (colleges.length === 0) return <div className="p-20 text-center text-gray-500">No colleges selected to compare.</div>;

  return (
    <div className="bg-[#F8FAFC] min-h-screen pb-20">
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <Link to="/colleges" className="inline-flex items-center gap-2 text-[#4A7B5B] hover:underline mb-4 font-semibold text-sm">
            <ArrowLeft size={16} /> Back to Colleges
          </Link>
          <h1 className="text-3xl font-extrabold text-[#0F172A]">Compare Colleges & Offered Programs</h1>
          <p className="text-gray-500 mt-2 text-sm">Compare fees, courses, branches, hostel, and seat availability.</p>
          
          <div className="mt-4 p-3 bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl text-xs text-[#1D4ED8] flex items-center gap-2">
            <Sparkles size={16} />
            <span><strong>Notice:</strong> Seats, fee structures, and scholarship availability vary by Course + Branch + Session. {colleges[0]?.availabilityDisclaimer || "Availability subject to college confirmation."}</span>
          </div>

          {successMsg && (
            <div className="mt-3 p-3 bg-[#ECFDF5] border border-[#A7F3D0] text-[#047857] text-xs rounded-xl font-semibold">
              {successMsg}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 overflow-x-auto">
        <table className="w-full text-left bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden min-w-[800px]">
          <thead className="bg-[#f1f5f9] text-[#64748b] text-xs uppercase font-bold tracking-wider">
            <tr>
              <th className="px-6 py-4">Features & Offerings</th>
              {colleges.map((c) => (
                <th key={c.id} className="px-6 py-4 text-[#0F172A] w-72">
                  <div className="text-base font-extrabold">{c.name}</div>
                  <div className="text-xs text-gray-500 font-medium normal-case mt-1">{c.city}, {c.state}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm">
            <tr>
              <td className="px-6 py-4 font-semibold text-gray-700">Type / Ownership</td>
              {colleges.map(c => <td key={c.id} className="px-6 py-4 font-medium">{c.type || c.ownership || "N/A"}</td>)}
            </tr>
            <tr>
              <td className="px-6 py-4 font-semibold text-gray-700">NIRF / NAAC Grade</td>
              {colleges.map(c => <td key={c.id} className="px-6 py-4">{c.naacGrade || (c.nirfRanking ? `NIRF #${c.nirfRanking}` : "N/A")}</td>)}
            </tr>
            <tr>
              <td className="px-6 py-4 font-semibold text-gray-700">Average Placement Package</td>
              {colleges.map(c => <td key={c.id} className="px-6 py-4 text-[#059669] font-bold">₹{c.averagePackage?.toLocaleString() || "N/A"} / yr</td>)}
            </tr>
            <tr>
              <td className="px-6 py-4 font-semibold text-gray-700">Facilities</td>
              {colleges.map(c => (
                <td key={c.id} className="px-6 py-4 text-xs space-y-1">
                  <div className="flex items-center gap-1">Hostel: {c.hostelAvailable ? <CheckCircle2 size={14} className="text-green-500" /> : <XCircle size={14} className="text-red-400" />}</div>
                  <div className="flex items-center gap-1">Transport: {c.transportAvailable ? <CheckCircle2 size={14} className="text-green-500" /> : <XCircle size={14} className="text-red-400" />}</div>
                  <div className="flex items-center gap-1">Scholarship: {c.scholarshipAvailable ? <CheckCircle2 size={14} className="text-green-500" /> : <XCircle size={14} className="text-red-400" />}</div>
                </td>
              ))}
            </tr>
            <tr>
              <td className="px-6 py-4 font-semibold text-gray-700 align-top">Available Courses & Fee Structures</td>
              {colleges.map(c => (
                <td key={c.id} className="px-6 py-4 text-xs space-y-3 align-top">
                  {c.courses && c.courses.length > 0 ? (
                    c.courses.slice(0, 4).map((crs: any) => (
                      <div key={crs.id} className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl space-y-1.5">
                        <div className="font-bold text-[#0F172A]">{crs.name}</div>
                        <div className="text-[#64748B]">Fees: <strong className="text-[#4A7B5B]">₹{crs.totalFees?.toLocaleString() || "N/A"}</strong> ({crs.duration || 3} Yrs)</div>
                        {crs.branches && crs.branches.length > 0 && (
                          <div className="text-[11px] text-gray-500">
                            Branches: {crs.branches.map((b: any) => b.name).join(", ")}
                          </div>
                        )}
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={() => handleShortlistOffering(c.id, crs.id, crs.branches?.[0]?.id)}
                            disabled={actionLoading === `${c.id}-${crs.id}`}
                            className="px-2.5 py-1 bg-white border border-[#4A7B5B] text-[#4A7B5B] rounded-lg font-semibold hover:bg-[#F0FDF4] transition-colors"
                          >
                            + Shortlist
                          </button>
                          <button
                            onClick={() => handleApplyOffering(c.id, crs.id, crs.branches?.[0]?.id)}
                            disabled={actionLoading === `apply-${c.id}-${crs.id}`}
                            className="px-2.5 py-1 bg-[#4A7B5B] text-white rounded-lg font-semibold hover:bg-[#3B6349] transition-colors flex items-center gap-1"
                          >
                            <Send size={10} /> Apply
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-gray-400">No courses listed</div>
                  )}
                </td>
              ))}
            </tr>
            <tr>
              <td className="px-6 py-4"></td>
              {colleges.map(c => (
                <td key={c.id} className="px-6 py-4">
                  <Link to={`/colleges/${c.id}`} className="block w-full text-center py-2 bg-[#E8F3EC] text-[#4A7B5B] rounded-lg font-semibold text-sm hover:bg-[#d1e6d9] transition-colors">
                    View Full Profile
                  </Link>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
