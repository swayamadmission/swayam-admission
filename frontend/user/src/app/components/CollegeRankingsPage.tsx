import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import {
  Trophy,
  Award,
  Star,
  Search,
  Building2,
  MapPin,
  BadgeCheck,
  Info,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { reviewsRankingApi } from '../../api/reviews-ranking.api';

export const CollegeRankingsPage: React.FC = () => {
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [search, setSearch] = useState<string>('');
  const [selectedState, setSelectedState] = useState<string>('all');
  const [selectedTier, setSelectedTier] = useState<string>('all');
  const [showMethodology, setShowMethodology] = useState<boolean>(false);

  const { data: rankingRes, isLoading } = useQuery({
    queryKey: ['public_rankings', selectedYear, search, selectedState, selectedTier],
    queryFn: () =>
      reviewsRankingApi.getPublicRankings({
        year: selectedYear,
        search: search.trim() || undefined,
        state: selectedState === 'all' ? undefined : selectedState,
        tier: selectedTier === 'all' ? undefined : selectedTier,
      }),
  });

  const edition = rankingRes?.data?.edition;
  const results = rankingRes?.data?.results || [];

  const statesList = [
    'All States',
    'Maharashtra',
    'Delhi',
    'Karnataka',
    'Tamil Nadu',
    'Uttar Pradesh',
    'Telangana',
    'Gujarat',
    'West Bengal',
    'Rajasthan',
    'Punjab',
    'Haryana',
  ];

  return (
    <div className="bg-[#F8FAFC] min-h-screen pb-16">
      {/* Hero Banner */}
      <section className="bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#4A7B5B] text-white py-14 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-[#E8F3EC] text-xs font-bold border border-white/10">
            <Trophy size={14} className="text-[#F0AE1A]" /> Official Swayam National Rankings {selectedYear}
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
            India's Most Trusted College Rankings
          </h1>
          <p className="text-slate-300 text-sm sm:text-base max-w-3xl leading-relaxed">
            Data-backed rankings built on verified enrolled student experiences, official accreditation (NIRF & NAAC), placement outcomes, and Swayam on-ground campus audits.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={() => setShowMethodology(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-white/15 hover:bg-white/25 text-white text-xs font-bold rounded-xl border border-white/20 transition-all"
            >
              <Info size={14} /> Ranking Methodology & Data Provenance
            </button>
          </div>
        </div>
      </section>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6">
        {/* Filters Card */}
        <div className="bg-white rounded-2xl p-5 shadow-lg border border-slate-200/80 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-3 text-slate-400" size={16} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by college name, city..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-[#4A7B5B]/20"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* State Select */}
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-700 focus:outline-hidden"
            >
              {statesList.map((s) => (
                <option key={s} value={s === 'All States' ? 'all' : s}>
                  {s}
                </option>
              ))}
            </select>

            {/* Tier Select */}
            <select
              value={selectedTier}
              onChange={(e) => setSelectedTier(e.target.value)}
              className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-700 focus:outline-hidden"
            >
              <option value="all">All Tiers</option>
              <option value="TIER_1">Tier 1 (Top 20%)</option>
              <option value="TIER_2">Tier 2</option>
              <option value="TIER_3">Tier 3</option>
            </select>
          </div>
        </div>

        {/* Results Stats */}
        <div className="flex items-center justify-between py-4 text-xs font-bold text-slate-500">
          <span>Showing {results.length} ranked institutions</span>
          {edition && (
            <span className="text-[#4A7B5B] flex items-center gap-1">
              <ShieldCheck size={14} /> Published Edition: {edition.title}
            </span>
          )}
        </div>

        {/* Rankings Table / Cards */}
        {isLoading ? (
          <div className="py-24 text-center text-slate-400">Loading ranking leaderboard...</div>
        ) : results.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 space-y-2">
            <Building2 className="mx-auto text-slate-300" size={40} />
            <p className="text-slate-800 font-bold text-base">No ranking results found</p>
            <p className="text-xs text-slate-400">Try broadening your search or state filters.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {results.map((r: any) => (
              <div
                key={r.id}
                className="bg-white rounded-2xl p-5 border border-slate-200/80 hover:border-[#4A7B5B]/50 hover:shadow-md transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                {/* Rank & Logo */}
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                    <span className="text-base font-black text-slate-800">
                      {r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : r.rank === 3 ? '🥉' : `#${r.rank}`}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to={`/colleges/${r.college.slug || r.college.id}`}
                        className="font-bold text-[#0F172A] text-base hover:text-[#4A7B5B] transition-colors"
                      >
                        {r.college.name}
                      </Link>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          r.tier === 'TIER_1'
                            ? 'bg-[#E8F3EC] text-[#4A7B5B] border border-[#4A7B5B]/30'
                            : r.tier === 'TIER_2'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {r.tier?.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <MapPin size={12} className="text-slate-400" /> {r.college.city}, {r.college.state}
                      </span>
                      {r.college.naacGrade && (
                        <span className="px-1.5 py-0.2 bg-blue-50 text-blue-700 font-bold rounded text-[11px]">
                          NAAC {r.college.naacGrade}
                        </span>
                      )}
                      {r.college.nirfRanking && (
                        <span className="px-1.5 py-0.2 bg-purple-50 text-purple-700 font-bold rounded text-[11px]">
                          NIRF #{r.college.nirfRanking}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Score & Reviews */}
                <div className="flex items-center gap-6 self-end sm:self-center">
                  <div className="text-right">
                    <div className="flex items-center gap-1 justify-end font-black text-slate-900 text-lg">
                      <span className="text-[#4A7B5B]">{r.score.toFixed(1)}</span>
                      <span className="text-xs text-slate-400 font-normal">/ 100</span>
                    </div>
                    <div className="text-[11px] text-[#4A7B5B] font-bold flex items-center gap-1 justify-end">
                      <BadgeCheck size={12} /> {r.verifiedReviewCount} Verified Student Reviews
                    </div>
                  </div>

                  <Link
                    to={`/colleges/${r.college.slug || r.college.id}`}
                    className="p-2.5 bg-[#E8F3EC] hover:bg-[#4A7B5B] text-[#4A7B5B] hover:text-white rounded-xl transition-all shadow-xs"
                    title="View College Profile"
                  >
                    <ArrowRight size={16} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Methodology Modal */}
      {showMethodology && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="text-[#4A7B5B]" size={24} />
                <h3 className="font-bold text-[#0F172A] text-xl">Swayam Ranking Methodology & Integrity</h3>
              </div>
              <button onClick={() => setShowMethodology(false)} className="text-slate-400 hover:text-slate-700 font-bold">
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs sm:text-sm text-slate-600 leading-relaxed">
              <p>
                Swayam National College Rankings are computed using an objective multi-factor weighted algorithm designed to eliminate commercial bias and protect students from manipulated reviews.
              </p>

              <div className="bg-slate-50 p-4 rounded-2xl space-y-2 border border-slate-200/60">
                <div className="font-bold text-slate-800 text-sm">Weighted Scoring Model:</div>
                <ul className="space-y-1.5 list-disc list-inside text-xs">
                  <li><strong>Verified Student Reviews (30%):</strong> Bayesian smoothed ratings from enrolled students who have confirmed admission.</li>
                  <li><strong>Academic Quality & Accreditation (20%):</strong> NAAC accreditation grade and NIRF official national standing.</li>
                  <li><strong>Placement Outcomes (15%):</strong> Highest & average CTC packages, corporate hiring consistency.</li>
                  <li><strong>Campus Infrastructure (15%):</strong> Labs, digital classrooms, libraries, sports facilities.</li>
                  <li><strong>Hostel & Mess Standards (10%):</strong> Cleanliness, Wi-Fi, food hygiene audits.</li>
                  <li><strong>Swayam On-Ground Audit (10%):</strong> Physical verification of campus safety and transparent fees.</li>
                </ul>
              </div>

              <div className="space-y-2">
                <div className="font-bold text-slate-800">Confidence Model (Bayesian Smoothing):</div>
                <p className="text-xs">
                  To prevent colleges with only 1 or 2 high reviews from skewing the rankings, ratings are calculated using Bayesian prior smoothing: (v · R + m · C) / (v + m), where v is verified reviews count, m is the minimum threshold, and C is the national average.
                </p>
              </div>

              <div className="space-y-2">
                <div className="font-bold text-slate-800">Data Provenance Tags:</div>
                <p className="text-xs">
                  Every metric explicitly discloses its provenance: <code className="text-[#4A7B5B]">STUDENT_REVIEW</code>, <code className="text-blue-700">OFFICIAL_ACCREDITATION</code>, <code className="text-purple-700">SWAYAM_VERIFIED</code>, and <code className="text-slate-600">COLLEGE_PROVIDED</code>.
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowMethodology(false)}
                className="px-6 py-2.5 bg-[#4A7B5B] hover:bg-[#3d664b] text-white text-xs font-bold rounded-xl shadow-xs"
              >
                Close & Explore
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
