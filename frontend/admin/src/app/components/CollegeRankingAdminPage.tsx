import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Trophy,
  Award,
  Sparkles,
  CheckCircle2,
  Globe,
  Sliders,
  Calendar,
  Layers,
  Search,
  ArrowUpDown,
  FileCheck2,
  Archive,
  BarChart3,
  ShieldCheck,
  Building2,
} from 'lucide-react';
import {
  reviewsRankingApi,
  RankingEditionItem,
  CollegeRankingResultItem,
} from '../../api/reviews-ranking.api';

export const CollegeRankingAdminPage: React.FC = () => {
  const queryClient = useQueryClient();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showCalcModal, setShowCalcModal] = useState<boolean>(false);

  // Calculation parameters state
  const [calcYear, setCalcYear] = useState<number>(currentYear);
  const [minThreshold, setMinThreshold] = useState<number>(3);
  const [weights, setWeights] = useState({
    studentReviews: 0.30,
    academicQuality: 0.20,
    infrastructure: 0.15,
    hostelMess: 0.10,
    placementOutcomes: 0.15,
    swayamVerification: 0.10,
  });

  // Query Editions
  const { data: editionsRes } = useQuery({
    queryKey: ['ranking_editions'],
    queryFn: () => reviewsRankingApi.getRankingEditions(),
  });

  // Query Selected Edition Details
  const { data: detailsRes, isLoading } = useQuery({
    queryKey: ['ranking_edition_details', selectedYear, tierFilter, searchQuery],
    queryFn: () =>
      reviewsRankingApi.getEditionDetails(selectedYear, {
        tier: tierFilter === 'all' ? undefined : tierFilter,
        search: searchQuery.trim() || undefined,
      }),
  });

  // Calculate Mutation
  const calculateMutation = useMutation({
    mutationFn: (payload: any) => reviewsRankingApi.calculateRanking(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ranking_editions'] });
      queryClient.invalidateQueries({ queryKey: ['ranking_edition_details'] });
      setShowCalcModal(false);
      alert(data.message || 'Ranking calculated successfully!');
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Calculation failed');
    },
  });

  // Approve Mutation
  const approveMutation = useMutation({
    mutationFn: (year: number) => reviewsRankingApi.approveRankingEdition(year),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ranking_editions'] });
      queryClient.invalidateQueries({ queryKey: ['ranking_edition_details'] });
      alert(`Edition ${selectedYear} approved successfully!`);
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Approval failed');
    },
  });

  // Publish Mutation
  const publishMutation = useMutation({
    mutationFn: (year: number) => reviewsRankingApi.publishRankingEdition(year),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ranking_editions'] });
      queryClient.invalidateQueries({ queryKey: ['ranking_edition_details'] });
      alert(`🎉 Official Swayam College Rankings ${selectedYear} PUBLISHED!`);
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Publishing failed');
    },
  });

  // Unpublish Mutation
  const unpublishMutation = useMutation({
    mutationFn: (year: number) =>
      reviewsRankingApi.unpublishRankingEdition(year, { unpublishReason: 'Administrative revision' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ranking_editions'] });
      queryClient.invalidateQueries({ queryKey: ['ranking_edition_details'] });
      alert(`Edition ${selectedYear} archived.`);
    },
  });

  const editions: RankingEditionItem[] = editionsRes?.data || [];
  const currentEdition: RankingEditionItem | undefined = detailsRes?.data?.edition;
  const results: CollegeRankingResultItem[] = detailsRes?.data?.results || [];

  const handleRunCalculation = () => {
    calculateMutation.mutate({
      year: calcYear,
      title: `Swayam National College Rankings ${calcYear}`,
      algorithmVersion: 'v1.0',
      minReviewThreshold: minThreshold,
      weightsConfig: weights,
    });
  };

  return (
    <div className="p-6 bg-[#F8FAFC] min-h-screen space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="text-[#F0AE1A]" size={24} />
            <h1 className="text-2xl font-bold text-[#0F172A]">Annual College Ranking Governance</h1>
          </div>
          <p className="text-sm text-slate-500">
            Configure weighted ranking algorithm, inspect data provenance, review draft editions, and publish official snapshots.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowCalcModal(true)}
            className="px-4 py-2.5 bg-[#4A7B5B] hover:bg-[#3d664b] text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-xs"
          >
            <Sliders size={14} /> Calculate Ranking Snapshot
          </button>

          {currentEdition?.status === 'DRAFT' && (
            <button
              onClick={() => approveMutation.mutate(selectedYear)}
              disabled={approveMutation.isPending}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-xs"
            >
              <CheckCircle2 size={14} /> Approve Edition
            </button>
          )}

          {(currentEdition?.status === 'APPROVED' || currentEdition?.status === 'DRAFT') && (
            <button
              onClick={() => publishMutation.mutate(selectedYear)}
              disabled={publishMutation.isPending}
              className="px-4 py-2.5 bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-xs"
            >
              <Globe size={14} /> Publish Official Snapshot
            </button>
          )}

          {currentEdition?.status === 'PUBLISHED' && (
            <button
              onClick={() => unpublishMutation.mutate(selectedYear)}
              disabled={unpublishMutation.isPending}
              className="px-3.5 py-2.5 bg-slate-100 hover:bg-red-50 text-red-600 text-xs font-bold rounded-xl border border-red-200 transition-all flex items-center gap-1.5"
            >
              <Archive size={14} /> Archive / Unpublish
            </button>
          )}
        </div>
      </div>

      {/* Editions Switcher & Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200/80">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 uppercase">Select Edition:</span>
          <div className="flex items-center gap-1.5">
            {[currentYear + 1, currentYear, currentYear - 1].map((yr) => {
              const editionExists = editions.some((e) => e.year === yr);
              return (
                <button
                  key={yr}
                  onClick={() => setSelectedYear(yr)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    selectedYear === yr
                      ? 'bg-[#0F172A] text-white'
                      : editionExists
                      ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                  }`}
                >
                  {yr} Edition {editionExists ? '' : '(New)'}
                </button>
              );
            })}
          </div>
        </div>

        {/* Status Tag */}
        {currentEdition ? (
          <div className="flex items-center gap-3 text-xs">
            <span className="text-slate-500">Status:</span>
            <span
              className={`px-2.5 py-1 rounded-md font-bold text-xs ${
                currentEdition.status === 'PUBLISHED'
                  ? 'bg-[#E8F3EC] text-[#4A7B5B] border border-[#4A7B5B]/30'
                  : currentEdition.status === 'APPROVED'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              ● {currentEdition.status}
            </span>
            <span className="text-slate-400">
              Algorithm: <strong>{currentEdition.algorithmVersion}</strong>
            </span>
            <span className="text-slate-400">
              Ranked Colleges: <strong>{results.length}</strong>
            </span>
          </div>
        ) : (
          <div className="text-xs text-amber-600 font-medium">
            Edition {selectedYear} has not been calculated yet. Click "Calculate Ranking Snapshot" to generate.
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-3 text-slate-400" size={16} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search college by name..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-[#4A7B5B]/20"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-xs font-bold text-slate-500">Tier:</span>
          {['all', 'TIER_1', 'TIER_2', 'TIER_3'].map((t) => (
            <button
              key={t}
              onClick={() => setTierFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                tierFilter === t ? 'bg-[#4A7B5B] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {t === 'all' ? 'All Tiers' : t.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="py-20 text-center text-slate-400">Loading ranking leaderboard...</div>
        ) : results.length === 0 ? (
          <div className="py-20 text-center space-y-2">
            <Trophy className="mx-auto text-slate-300" size={36} />
            <p className="text-slate-700 font-bold text-sm">No rankings found for this criteria</p>
            <p className="text-xs text-slate-400">Run ranking calculation or adjust filter criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-5 py-3.5">Rank</th>
                  <th className="px-5 py-3.5">College Details</th>
                  <th className="px-5 py-3.5">Tier</th>
                  <th className="px-5 py-3.5">Composite Score</th>
                  <th className="px-5 py-3.5">Verified Reviews</th>
                  <th className="px-5 py-3.5">Factor Scores (Breakdown)</th>
                  <th className="px-5 py-3.5">Data Provenance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {results.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Rank */}
                    <td className="px-5 py-4 font-black text-slate-900 text-base">
                      {r.rank === 1 ? '🥇 #1' : r.rank === 2 ? '🥈 #2' : r.rank === 3 ? '🥉 #3' : `#${r.rank}`}
                    </td>

                    {/* College Details */}
                    <td className="px-5 py-4">
                      <div className="font-bold text-[#0F172A] text-sm">{r.college.name}</div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>{r.college.city}, {r.college.state}</span>
                        {r.college.naacGrade && (
                          <span className="px-1.5 py-0.2 bg-blue-50 text-blue-700 font-bold rounded">
                            NAAC {r.college.naacGrade}
                          </span>
                        )}
                        {r.college.nirfRanking && (
                          <span className="px-1.5 py-0.2 bg-purple-50 text-purple-700 font-bold rounded">
                            NIRF #{r.college.nirfRanking}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Tier */}
                    <td className="px-5 py-4">
                      <span
                        className={`px-2.5 py-1 rounded-md font-bold text-[11px] ${
                          r.tier === 'TIER_1'
                            ? 'bg-[#E8F3EC] text-[#4A7B5B] border border-[#4A7B5B]/30'
                            : r.tier === 'TIER_2'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {r.tier?.replace('_', ' ')}
                      </span>
                    </td>

                    {/* Score */}
                    <td className="px-5 py-4 font-bold text-slate-800 text-sm">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[#4A7B5B] text-base">{r.score.toFixed(1)}</span>
                        <span className="text-[10px] text-slate-400">/ 100</span>
                      </div>
                      <div className="text-[10px] text-slate-400">{r.percentile}% percentile</div>
                    </td>

                    {/* Verified Reviews */}
                    <td className="px-5 py-4">
                      <div className="font-bold text-slate-700">{r.verifiedReviewCount} Verified</div>
                      <div className="text-[10px] text-slate-400">Avg {r.averageReviewRating || 4.0} ★</div>
                    </td>

                    {/* Breakdown */}
                    <td className="px-5 py-4">
                      <div className="space-y-1 text-[11px] text-slate-600">
                        <div>Reviews: <strong>{r.factorBreakdown?.studentReviewsScore}</strong></div>
                        <div>Academic: <strong>{r.factorBreakdown?.academicScore}</strong></div>
                        <div>Placements: <strong>{r.factorBreakdown?.placementScore}</strong></div>
                        <div>Infra: <strong>{r.factorBreakdown?.infraScore}</strong></div>
                      </div>
                    </td>

                    {/* Provenance */}
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1">
                        <span className="px-1.5 py-0.5 bg-[#E8F3EC] text-[#4A7B5B] rounded text-[10px] font-bold">
                          Student Verified
                        </span>
                        <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px]">
                          NIRF / NAAC
                        </span>
                        <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px]">
                          Swayam Audit
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Interactive Calculation Modal */}
      {showCalcModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-[#0F172A] text-lg flex items-center gap-2">
                <Sliders className="text-[#4A7B5B]" size={20} /> Ranking Algorithm Weights & Config
              </h3>
              <button onClick={() => setShowCalcModal(false)} className="text-slate-400 hover:text-slate-700 font-bold">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Edition Year</label>
                  <input
                    type="number"
                    value={calcYear}
                    onChange={(e) => setCalcYear(Number(e.target.value))}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Min Review Threshold</label>
                  <input
                    type="number"
                    value={minThreshold}
                    onChange={(e) => setMinThreshold(Number(e.target.value))}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="font-bold text-slate-800">Factor Weights (%):</div>

                <div>
                  <div className="flex justify-between font-medium text-slate-600 mb-1">
                    <span>Verified Student Reviews</span>
                    <span>{(weights.studentReviews * 100).toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={weights.studentReviews}
                    onChange={(e) => setWeights({ ...weights, studentReviews: parseFloat(e.target.value) })}
                    className="w-full accent-[#4A7B5B]"
                  />
                </div>

                <div>
                  <div className="flex justify-between font-medium text-slate-600 mb-1">
                    <span>Academic Quality & Accreditation (NAAC/NIRF)</span>
                    <span>{(weights.academicQuality * 100).toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={weights.academicQuality}
                    onChange={(e) => setWeights({ ...weights, academicQuality: parseFloat(e.target.value) })}
                    className="w-full accent-[#4A7B5B]"
                  />
                </div>

                <div>
                  <div className="flex justify-between font-medium text-slate-600 mb-1">
                    <span>Placement Outcomes & Package</span>
                    <span>{(weights.placementOutcomes * 100).toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={weights.placementOutcomes}
                    onChange={(e) => setWeights({ ...weights, placementOutcomes: parseFloat(e.target.value) })}
                    className="w-full accent-[#4A7B5B]"
                  />
                </div>

                <div>
                  <div className="flex justify-between font-medium text-slate-600 mb-1">
                    <span>Infrastructure & Campus Facilities</span>
                    <span>{(weights.infrastructure * 100).toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={weights.infrastructure}
                    onChange={(e) => setWeights({ ...weights, infrastructure: parseFloat(e.target.value) })}
                    className="w-full accent-[#4A7B5B]"
                  />
                </div>

                <div>
                  <div className="flex justify-between font-medium text-slate-600 mb-1">
                    <span>Swayam Manual Audit & Safety Factors</span>
                    <span>{(weights.swayamVerification * 100).toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={weights.swayamVerification}
                    onChange={(e) => setWeights({ ...weights, swayamVerification: parseFloat(e.target.value) })}
                    className="w-full accent-[#4A7B5B]"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setShowCalcModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleRunCalculation}
                disabled={calculateMutation.isPending}
                className="px-5 py-2 bg-[#4A7B5B] hover:bg-[#3d664b] text-white text-xs font-bold rounded-xl shadow-xs"
              >
                {calculateMutation.isPending ? 'Calculating...' : 'Run Ranking Calculation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
