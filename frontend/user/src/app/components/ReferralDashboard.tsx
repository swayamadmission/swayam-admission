import React, { useState, useEffect } from 'react';
import {
  Gift,
  Share2,
  Copy,
  Check,
  Users,
  Award,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  MessageSquare,
  Mail,
  ShieldCheck,
  ChevronRight,
  Sparkles,
  Zap,
  Info,
  BadgeCheck,
} from 'lucide-react';
import {
  referralApi,
  StudentReferralHubResponse,
  StudentReferralBenefitResponse,
} from '../../api/referral.api';

export const ReferralDashboard: React.FC = () => {
  const [data, setData] = useState<StudentReferralHubResponse | null>(null);
  const [myBenefit, setMyBenefit] = useState<StudentReferralBenefitResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const fetchReferrals = async () => {
    try {
      setLoading(true);
      setError(null);
      const [hubRes, benefitRes] = await Promise.all([
        referralApi.getMyReferralHub(),
        referralApi.getMyBenefit().catch(() => null),
      ]);
      setData(hubRes);
      if (benefitRes) {
        setMyBenefit(benefitRes);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Unable to load referral dashboard. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReferrals();
  }, []);

  const handleCopyCode = () => {
    if (!data?.referralCode) return;
    navigator.clipboard.writeText(data.referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleCopyLink = () => {
    if (!data?.shareUrl) return;
    navigator.clipboard.writeText(data.shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleWhatsAppShare = () => {
    if (!data?.shareUrl || !data?.referralCode) return;
    const text = encodeURIComponent(
      `Hey! Apply to top verified universities with my Swayam Admission referral code ${data.referralCode} and get 100% Free Counselling & admission guidance: ${data.shareUrl}`,
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleEmailShare = () => {
    if (!data?.shareUrl || !data?.referralCode) return;
    const subject = encodeURIComponent('Invitation to apply on Swayam Admission Portal');
    const body = encodeURIComponent(
      `Hello,\n\nI recommend applying through Swayam Admission. Use my referral code ${data.referralCode} to get 100% Free Counselling:\n${data.shareUrl}\n\nBest regards!`,
    );
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#4A7B5B] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-[#0F172A]">Loading Swayam Admission rewards...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <h3 className="text-base font-semibold text-red-900 mb-1">Failed to Load Referrals</h3>
          <p className="text-sm text-red-700 mb-4">{error}</p>
          <button
            onClick={fetchReferrals}
            className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const stats = data?.stats || {
    totalInvites: 0,
    totalValidReferrals: 0,
    qualifyingReferrals: 0,
    currentTier: 'None',
    currentTierReward: 0,
    totalRewardsEarned: 0,
    totalRewardsPaid: 0,
    pendingApprovalRewards: 0,
    nextTier: null,
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
      {/* Referred Student Benefit Card (If user was referred) */}
      {myBenefit?.isReferred && (
        <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-emerald-500/10 border border-emerald-500/30 p-4 md:p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <BadgeCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Your Referral Benefit</span>
                <span className="bg-emerald-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full">ACTIVE</span>
              </div>
              <p className="text-sm font-bold text-slate-900 mt-0.5">
                {myBenefit.message || '100% OFF Admission Counselling Fee (Pay ₹0 instead of ₹1,000)'}
              </p>
              <p className="text-xs text-slate-600">
                Referred by: <strong className="text-slate-800">{myBenefit.referrerName}</strong> (Code: <span className="font-mono">{myBenefit.referralCode}</span>)
              </p>
            </div>
          </div>
          <span className="text-xs font-bold bg-white px-3 py-1.5 rounded-xl text-emerald-700 border border-emerald-200 shadow-2xs whitespace-nowrap">
            Applied to Counselling Fee
          </span>
        </div>
      )}

      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0F172A] to-[#1E293B] text-white p-6 md:p-8 shadow-sm border border-white/10">
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#4A7B5B]/30 text-[#E8F3EC] border border-[#4A7B5B]/50 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-[#F0AE1A]" />
              Swayam Admission Referral & Rewards ({data?.ruleVersion || 'v1.0'})
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
              Refer Students & Earn Up to ₹10,000
            </h1>
            <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
              Invite peers to apply through Swayam Admission. Earn <strong className="text-white">₹4,000 for Tier 1</strong> (4 referrals, 3 qualifying) and <strong className="text-[#F0AE1A]">₹10,000 for Tier 2</strong> (8 referrals, 6 qualifying)!
            </p>
            <div className="flex items-center gap-2 pt-1">
              <span className="text-[11px] bg-white/10 px-2.5 py-1 rounded-lg text-emerald-300 flex items-center gap-1 font-medium">
                ✓ Any qualifying students in your pool count
              </span>
              <span className="text-[11px] bg-white/10 px-2.5 py-1 rounded-lg text-slate-300 font-medium">
                ✓ Your own admission is NOT required
              </span>
            </div>
          </div>

          {/* Referral Code Box */}
          <div className="w-full lg:w-auto bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-5 flex flex-col items-center gap-3 min-w-[280px]">
            <span className="text-xs uppercase tracking-wider text-slate-300 font-bold">Your Official Referral Code</span>
            <div className="flex items-center gap-2 bg-[#0F172A] px-4 py-2.5 rounded-xl border border-white/10 w-full justify-between">
              <span className="font-mono text-base font-extrabold tracking-widest text-[#F0AE1A]">
                {data?.referralCode || 'SWY-XXXX'}
              </span>
              <button
                onClick={handleCopyCode}
                className="p-1.5 hover:bg-white/10 rounded-lg transition text-white/80 hover:text-white"
                title="Copy Code"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            {/* Quick Share Buttons */}
            <div className="flex items-center gap-2 w-full">
              <button
                onClick={handleWhatsAppShare}
                className="flex-1 py-2 px-3 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-xs"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                WhatsApp
              </button>
              <button
                onClick={handleCopyLink}
                className="flex-1 py-2 px-3 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition border border-white/10"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
                {copiedLink ? 'Copied' : 'Share Link'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Referrals */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Total Referrals</span>
            <Users className="w-4 h-4 text-[#4A7B5B]" />
          </div>
          <p className="text-2xl font-black text-slate-900">{stats.totalValidReferrals}</p>
          <p className="text-[11px] text-slate-400">Registered candidates in your pool</p>
        </div>

        {/* Qualifying Students */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Qualifying Students</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-600">{stats.qualifyingReferrals}</p>
          <p className="text-[11px] text-emerald-700/80 font-medium">1-Year completed + 1-Year fee paid</p>
        </div>

        {/* Achieved Tier */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Achieved Tier</span>
            <Award className="w-4 h-4 text-[#F0AE1A]" />
          </div>
          <p className="text-2xl font-black text-slate-900">{stats.currentTier}</p>
          <p className="text-[11px] text-slate-500 font-medium">
            {stats.currentTierReward > 0 ? `₹${stats.currentTierReward.toLocaleString()} Gross Entitled` : 'Keep inviting to reach Tier 1'}
          </p>
        </div>

        {/* Total Paid Out */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Total Rewards Paid</span>
            <TrendingUp className="w-4 h-4 text-[#4A7B5B]" />
          </div>
          <p className="text-2xl font-black text-emerald-700">₹{stats.totalRewardsPaid.toLocaleString()}</p>
          <p className="text-[11px] text-slate-400">
            {stats.pendingApprovalRewards > 0
              ? `₹${stats.pendingApprovalRewards.toLocaleString()} pending finance review`
              : 'Direct bank / UPI transfers'}
          </p>
        </div>
      </div>

      {/* Tier Roadmap Progress Card */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
          <div>
            <h2 className="text-base font-extrabold text-slate-900">Referral Milestones & Next Tier Progress</h2>
            <p className="text-xs text-slate-500">Tier requirements calculate strictly from valid candidates and 1-year qualifying criteria.</p>
          </div>
          {stats.nextTier && (
            <span className="text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
              Next Goal: {stats.nextTier.tier.name} (₹{stats.nextTier.tier.rewardAmount.toLocaleString()})
            </span>
          )}
        </div>

        {/* Milestone Steps */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {/* Tier 1 Box */}
          <div
            className={`p-4 rounded-xl border transition-all ${
              stats.totalValidReferrals >= 4 && stats.qualifyingReferrals >= 3
                ? 'bg-[#E8F3EC]/60 border-[#4A7B5B]/30'
                : 'bg-slate-50/70 border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    stats.totalValidReferrals >= 4 && stats.qualifyingReferrals >= 3
                      ? 'bg-[#4A7B5B] text-white'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  1
                </div>
                <span className="text-sm font-black text-slate-900">Tier 1 — ₹4,000 Reward</span>
              </div>
              {stats.totalValidReferrals >= 4 && stats.qualifyingReferrals >= 3 && (
                <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Achieved
                </span>
              )}
            </div>
            <div className="mt-3 space-y-1.5 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Total Candidates Needed: <strong>4</strong></span>
                <span className="font-semibold">{stats.totalValidReferrals} / 4</span>
              </div>
              <div className="flex justify-between">
                <span>Qualifying Students Needed: <strong>3</strong></span>
                <span className="font-semibold text-emerald-700">{stats.qualifyingReferrals} / 3</span>
              </div>
            </div>
          </div>

          {/* Tier 2 Box */}
          <div
            className={`p-4 rounded-xl border transition-all ${
              stats.totalValidReferrals >= 8 && stats.qualifyingReferrals >= 6
                ? 'bg-amber-50/70 border-amber-300'
                : 'bg-slate-50/70 border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    stats.totalValidReferrals >= 8 && stats.qualifyingReferrals >= 6
                      ? 'bg-[#F0AE1A] text-slate-900'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  2
                </div>
                <span className="text-sm font-black text-slate-900">Tier 2 — ₹10,000 Reward</span>
              </div>
              {stats.totalValidReferrals >= 8 && stats.qualifyingReferrals >= 6 && (
                <span className="text-[11px] font-bold text-amber-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Achieved
                </span>
              )}
            </div>
            <div className="mt-3 space-y-1.5 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Total Candidates Needed: <strong>8</strong></span>
                <span className="font-semibold">{stats.totalValidReferrals} / 8</span>
              </div>
              <div className="flex justify-between">
                <span>Qualifying Students Needed: <strong>6</strong></span>
                <span className="font-semibold text-amber-700">{stats.qualifyingReferrals} / 6</span>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        {stats.nextTier && (
          <div className="space-y-1.5 pt-2">
            <div className="flex justify-between text-xs text-slate-500">
              <span>Overall Progress to {stats.nextTier.tier.name}</span>
              <span className="font-bold text-[#4A7B5B]">{stats.nextTier.progressPercent}%</span>
            </div>
            <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#4A7B5B] to-[#F0AE1A] transition-all duration-500 rounded-full"
                style={{ width: `${stats.nextTier.progressPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>Need {stats.nextTier.referralsNeeded} more referrals</span>
              <span>Need {stats.nextTier.qualifyingNeeded} more qualifying students</span>
            </div>
          </div>
        )}
      </div>

      {/* Referred Candidates Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-extrabold text-slate-900">Referred Students & Qualification Status</h2>
            <p className="text-xs text-slate-500">Track admission progress and 1-year qualification milestones in real time.</p>
          </div>
          <span className="text-xs font-bold text-[#4A7B5B] bg-[#E8F3EC] px-3 py-1 rounded-full">
            {data?.referrals.length || 0} Registered
          </span>
        </div>

        {data?.referrals.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Gift className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-700">No Referrals Yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Share your referral code with friends and classmates to start earning Swayam Admission rewards!
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                <tr>
                  <th className="p-4">Referred Candidate</th>
                  <th className="p-4">Course & College</th>
                  <th className="p-4">Admission Status</th>
                  <th className="p-4">1-Yr College Milestone</th>
                  <th className="p-4">1-Yr College Fee</th>
                  <th className="p-4">Qualification Status</th>
                  <th className="p-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {data?.referrals.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-4 font-bold text-slate-900">
                      <div>{item.referredName}</div>
                      <div className="text-[11px] font-mono text-slate-400 font-normal">{item.referredMobile}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-semibold text-slate-800">{item.preferredCourse}</div>
                      <div className="text-[11px] text-slate-400">{item.preferredCollege}</div>
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          item.status === 'ENROLLED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : item.status === 'APPLICATION_SUBMITTED'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="p-4">
                      {item.isOneYearCompleted ? (
                        <span className="text-emerald-600 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                        </span>
                      ) : (
                        <span className="text-slate-400 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> In Progress
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      {item.isOneYearFeePaid ? (
                        <span className="text-emerald-600 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> 100% Paid
                        </span>
                      ) : (
                        <span className="text-slate-400 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> Pending
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      {item.isQualifying ? (
                        <span className="bg-emerald-100 text-emerald-800 font-extrabold px-2.5 py-1 rounded-full text-[10px] inline-flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" /> QUALIFIED
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Pending 1-Yr Criteria</span>
                      )}
                    </td>
                    <td className="p-4 text-slate-400 text-[11px]">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
export default ReferralDashboard;
