import React, { useEffect, useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router";
import { collegesApi } from "../../api/colleges.api";
import { counselingApi } from "../../api/counseling.api";
import { reviewsRankingApi } from "../../api/reviews-ranking.api";
import { ArrowLeft, CheckCircle2, XCircle, Sparkles, Send, Trophy, ShieldCheck, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export default function CompareCollegesPage() {
  const [searchParams] = useSearchParams();
  const ids = searchParams.get("ids")?.split(",") || [];
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  
  const [colleges, setColleges] = useState<any[]>([]);
  const [rankingData, setRankingData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (ids.length > 0) {
      collegesApi.compare(ids).then((res) => {
        setColleges(res.data);
        setLoading(false);
      }).catch(() => setLoading(false));

      reviewsRankingApi.compareColleges(ids).then((res: any) => {
        setRankingData(res.data);
      }).catch(() => {});
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

  const getCollegeRanking = (collegeId: string) => {
    if (!rankingData?.colleges) return null;
    const found = rankingData.colleges.find((item: any) => item.college?.id === collegeId || item.ranking?.collegeId === collegeId);
    return found?.ranking || null;
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
          <h1 className="text-3xl font-extrabold text-[#4A7B5B]">Compare Colleges & Offered Programs</h1>
          <p className="text-gray-500 mt-2 text-sm">Side-by-side 9-pillar research scores, placements, fees, courses, and facilities.</p>
          
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
              <th className="px-6 py-4">Features & Metrics</th>
              {colleges.map((c) => (
                <th key={c.id} className="px-6 py-4 text-[#4A7B5B] w-72">
                  <div className="text-base font-extrabold">{c.name}</div>
                  <div className="text-xs text-gray-500 font-medium normal-case mt-1">{c.city}, {c.state}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm">
            {/* Swayam National Rank */}
            <tr className="bg-[#E8F3EC]/30">
              <td className="px-6 py-4 font-bold text-[#4A7B5B] flex items-center gap-1.5">
                <Trophy size={16} className="text-[#F0AE1A]" /> Swayam National Rank
              </td>
              {colleges.map(c => {
                const r = getCollegeRanking(c.id);
                return (
                  <td key={c.id} className="px-6 py-4 font-extrabold text-[#4A7B5B] text-base">
                    {r ? (
                      <div className="flex items-center gap-2">
                        <span>#{r.rank}</span>
                        {r.movement === 'IMPROVED' && (
                          <span className="text-xs text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                            <TrendingUp size={12} /> +{r.rankChange || 1}
                          </span>
                        )}
                        {r.movement === 'DECLINED' && (
                          <span className="text-xs text-red-600 font-bold bg-red-50 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                            <TrendingDown size={12} /> {r.rankChange || -1}
                          </span>
                        )}
                        {r.movement === 'NEW_ENTRY' && (
                          <span className="text-xs text-[#F0AE1A] font-bold bg-amber-50 px-1.5 py-0.5 rounded">★ New</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400 font-normal">Unranked / Pending</span>
                    )}
                  </td>
                );
              })}
            </tr>

            {/* Composite Score & Confidence */}
            <tr>
              <td className="px-6 py-4 font-semibold text-gray-700">Composite Score & Evidence</td>
              {colleges.map(c => {
                const r = getCollegeRanking(c.id);
                return (
                  <td key={c.id} className="px-6 py-4">
                    {r ? (
                      <div className="space-y-1">
                        <div className="font-extrabold text-slate-800 text-base">{r.score.toFixed(1)} <span className="text-xs font-normal text-gray-400">/ 100</span></div>
                        <div className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                          <ShieldCheck size={12} /> {r.confidenceScore}% Confidence
                        </div>
                      </div>
                    ) : "N/A"}
                  </td>
                );
              })}
            </tr>

            {/* 9-Pillar Breakdown */}
            <tr>
              <td className="px-6 py-4 font-semibold text-gray-700 align-top">Nine Official Pillars</td>
              {colleges.map(c => {
                const r = getCollegeRanking(c.id);
                const p = r?.pillarScores;
                return (
                  <td key={c.id} className="px-6 py-4 text-xs space-y-1.5 align-top">
                    {p ? (
                      <div className="space-y-1 text-[11px] text-gray-600">
                        <div className="flex justify-between"><span>Academic (15%):</span> <strong>{p.academicExcellence?.toFixed(1) || '—'}</strong></div>
                        <div className="flex justify-between"><span>Placement (10%):</span> <strong>{p.placementCareer?.toFixed(1) || '—'}</strong></div>
                        <div className="flex justify-between font-bold text-[#4A7B5B]"><span>Student Exp (20%):</span> <strong>{p.studentDemandExperience?.toFixed(1) || '—'}</strong></div>
                        <div className="flex justify-between"><span>Campus & Infra (15%):</span> <strong>{p.infraCampus?.toFixed(1) || p.infrastructureCampus?.toFixed(1) || '—'}</strong></div>
                        <div className="flex justify-between"><span>Connectivity (10%):</span> <strong>{p.locationConnectivity?.toFixed(1) || '—'}</strong></div>
                        <div className="flex justify-between"><span>Hostel (10%):</span> <strong>{p.hostelLiving?.toFixed(1) || p.hostelLivingExperience?.toFixed(1) || '—'}</strong></div>
                        <div className="flex justify-between"><span>Safety & Health (5%):</span> <strong>{p.safetyHealthcare?.toFixed(1) || '—'}</strong></div>
                        <div className="flex justify-between"><span>Affordability (5%):</span> <strong>{p.affordabilityRoi?.toFixed(1) || '—'}</strong></div>
                        <div className="flex justify-between"><span>Trust (10%):</span> <strong>{p.trustTransparency?.toFixed(1) || '—'}</strong></div>
                      </div>
                    ) : (
                      <span className="text-gray-400">Scorecard data pending publication</span>
                    )}
                  </td>
                );
              })}
            </tr>

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
                        <div className="font-bold text-[#4A7B5B]">{crs.name}</div>
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
