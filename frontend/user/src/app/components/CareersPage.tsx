import React, { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useSearchParams, Link } from "react-router";
import {
  Briefcase,
  MapPin,
  Building2,
  Clock,
  Users,
  Search,
  Filter,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Calendar,
  IndianRupee,
  Mail,
  Share2,
  Sparkles,
  RotateCcw,
} from "lucide-react";
import { careersApi, Vacancy } from "../../api/careers.api";
import CareersHeroBanner from "./CareersHeroBanner";
import CareersApplyModal from "./CareersApplyModal";

const labelFmt = (s?: string) =>
  s ? s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "";

export default function CareersPage() {
  const { code: routeCode } = useParams<{ code?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  // Search & Filter state
  const [search, setSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState("ALL");
  const [selectedWorkMode, setSelectedWorkMode] = useState("ALL");
  const [selectedEmpType, setSelectedEmpType] = useState("ALL");
  const [selectedLocation, setSelectedLocation] = useState("ALL");

  // Selected vacancy in two-column desktop view
  const [selectedVacancyCode, setSelectedVacancyCode] = useState<string | null>(
    routeCode || searchParams.get("code") || null,
  );

  // Mobile view state (list vs detail)
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  // Apply Modal state
  const [applyingVacancy, setApplyingVacancy] = useState<Vacancy | null>(null);

  // 1. Fetch recruitment settings (admin-controlled email, titles, etc.)
  const { data: settingsRes } = useQuery({
    queryKey: ["careers_public_settings"],
    queryFn: careersApi.getSettings,
    staleTime: 5 * 60 * 1000,
  });
  const settings = settingsRes?.data;

  // 2. Fetch published vacancies
  const {
    data: vacanciesRes,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["careers_public_vacancies"],
    queryFn: () => careersApi.getVacancies(),
  });
  const allVacancies = vacanciesRes?.data || [];

  // Extract unique departments and locations for filter dropdowns
  const departments = useMemo(() => {
    const set = new Set(allVacancies.map((v) => v.department).filter(Boolean));
    return Array.from(set).sort();
  }, [allVacancies]);

  const locations = useMemo(() => {
    const set = new Set(allVacancies.map((v) => v.location).filter(Boolean));
    return Array.from(set).sort();
  }, [allVacancies]);

  // Client-side filtering
  const filteredVacancies = useMemo(() => {
    return allVacancies.filter((v) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesTitle = v.title.toLowerCase().includes(q);
        const matchesDept = v.department.toLowerCase().includes(q);
        const matchesCode = v.vacancyCode.toLowerCase().includes(q);
        const matchesLoc = v.location?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesDept && !matchesCode && !matchesLoc) {
          return false;
        }
      }

      if (selectedDept !== "ALL" && v.department !== selectedDept) {
        return false;
      }
      if (selectedWorkMode !== "ALL" && v.workMode !== selectedWorkMode) {
        return false;
      }
      if (selectedEmpType !== "ALL" && v.employmentType !== selectedEmpType) {
        return false;
      }
      if (selectedLocation !== "ALL" && v.location !== selectedLocation) {
        return false;
      }

      return true;
    });
  }, [
    allVacancies,
    search,
    selectedDept,
    selectedWorkMode,
    selectedEmpType,
    selectedLocation,
  ]);

  // Auto-select first vacancy or requested routeCode
  useEffect(() => {
    if (routeCode) {
      setSelectedVacancyCode(routeCode);
      setMobileDetailOpen(true);
    } else if (
      !selectedVacancyCode &&
      filteredVacancies.length > 0 &&
      window.innerWidth >= 1024
    ) {
      setSelectedVacancyCode(filteredVacancies[0].vacancyCode);
    }
  }, [routeCode, filteredVacancies, selectedVacancyCode]);

  const selectedVacancy = useMemo(() => {
    if (!selectedVacancyCode) return filteredVacancies[0] || null;
    return (
      allVacancies.find(
        (v) =>
          v.vacancyCode === selectedVacancyCode || v.id === selectedVacancyCode,
      ) ||
      filteredVacancies[0] ||
      null
    );
  }, [selectedVacancyCode, allVacancies, filteredVacancies]);

  const handleSelectJob = (v: Vacancy) => {
    setSelectedVacancyCode(v.vacancyCode);
    setMobileDetailOpen(true);
  };

  const handleResetFilters = () => {
    setSearch("");
    setSelectedDept("ALL");
    setSelectedWorkMode("ALL");
    setSelectedEmpType("ALL");
    setSelectedLocation("ALL");
  };

  const recruitmentEmail =
    settings?.recruitmentEmail || "careers@swayamadmission.com";

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col pt-16 sm:pt-20">
      {/* 1. Careers Hero Banner (1600x450 Admin Controlled) */}
      <CareersHeroBanner settings={settings} />

      {/* 2. Main Content Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 flex-1 w-full space-y-6">
        {/* Section Heading & Stats Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
              <span>Open Positions</span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#E8F3EC] text-[#4A7B5B] border border-[#CBD5E1]">
                {allVacancies.length} Active{" "}
                {allVacancies.length === 1 ? "Role" : "Roles"}
              </span>
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Explore rewarding career opportunities across our academic,
              counseling, engineering, and operational teams.
            </p>
          </div>

          {/* Quick Resume Email Callout */}
          <div className="flex items-center gap-2 px-3.5 py-2 bg-white rounded-xl border border-slate-200 shadow-sm text-xs text-slate-600">
            <Mail className="w-4 h-4 text-[#4A7B5B] shrink-0" />
            <span>Send Direct Resume:</span>
            <a
              href={`mailto:${recruitmentEmail}`}
              className="font-bold text-[#4A7B5B] hover:underline"
            >
              {recruitmentEmail}
            </a>
          </div>
        </div>

        {/* 3. Search and Filters Toolbar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by job title, department, or keyword..."
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/30 focus:border-[#4A7B5B] transition-all"
              />
            </div>

            {/* Department Dropdown */}
            <div className="w-full md:w-48">
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/30 focus:border-[#4A7B5B] text-slate-700"
              >
                <option value="ALL">All Departments</option>
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            {/* Work Mode Dropdown */}
            <div className="w-full md:w-40">
              <select
                value={selectedWorkMode}
                onChange={(e) => setSelectedWorkMode(e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/30 focus:border-[#4A7B5B] text-slate-700"
              >
                <option value="ALL">All Work Modes</option>
                <option value="ONSITE">Onsite</option>
                <option value="HYBRID">Hybrid</option>
                <option value="REMOTE">Remote</option>
              </select>
            </div>

            {/* Employment Type Dropdown */}
            <div className="w-full md:w-40">
              <select
                value={selectedEmpType}
                onChange={(e) => setSelectedEmpType(e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/30 focus:border-[#4A7B5B] text-slate-700"
              >
                <option value="ALL">All Types</option>
                <option value="FULL_TIME">Full Time</option>
                <option value="PART_TIME">Part Time</option>
                <option value="CONTRACT">Contract</option>
                <option value="INTERNSHIP">Internship</option>
              </select>
            </div>

            {/* Reset Button */}
            {(search ||
              selectedDept !== "ALL" ||
              selectedWorkMode !== "ALL" ||
              selectedEmpType !== "ALL" ||
              selectedLocation !== "ALL") && (
              <button
                onClick={handleResetFilters}
                className="px-3.5 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center justify-center gap-1.5 shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* 4. Vacancies Display Area */}
        {isLoading ? (
          <div className="p-16 text-center space-y-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="w-10 h-10 border-4 border-[#4A7B5B] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm font-medium text-slate-500">
              Loading available positions...
            </p>
          </div>
        ) : isError ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-red-200 text-red-600 space-y-3">
            <p className="font-semibold text-base">
              Failed to load job vacancies.
            </p>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 bg-[#4A7B5B] text-white rounded-lg text-xs font-bold shadow-sm"
            >
              Try Again
            </button>
          </div>
        ) : allVacancies.length === 0 ? (
          /* Empty State: No Open Positions in Database */
          <div className="p-16 text-center bg-white rounded-2xl border border-slate-200 shadow-sm max-w-2xl mx-auto space-y-4">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <Briefcase className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">
              No open positions at the moment.
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed max-w-md mx-auto">
              We currently do not have any open positions available. We are
              always looking for passionate talent to join our team. Feel free to
              email your resume directly to our recruitment team.
            </p>
            <div className="pt-2">
              <a
                href={`mailto:${recruitmentEmail}`}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#4A7B5B] hover:bg-[#3D664A] text-white text-sm font-bold rounded-xl shadow-md transition-colors"
              >
                <Mail className="w-4 h-4" />
                <span>Send Resume to {recruitmentEmail}</span>
              </a>
            </div>
          </div>
        ) : filteredVacancies.length === 0 ? (
          /* Empty State: No matching jobs for query */
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <p className="font-bold text-slate-800 text-base">
              No positions match your search criteria.
            </p>
            <p className="text-xs text-slate-500">
              Try adjusting your search terms or clearing your filters.
            </p>
            <button
              onClick={handleResetFilters}
              className="px-4 py-2 bg-[#4A7B5B] text-white rounded-xl text-xs font-bold shadow-sm"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          /* 5. Two-Column Experience on Desktop / Stacked on Mobile */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Job Cards List (5 Cols) */}
            <div
              className={`lg:col-span-5 space-y-3.5 ${
                mobileDetailOpen ? "hidden lg:block" : "block"
              }`}
            >
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
                Showing {filteredVacancies.length}{" "}
                {filteredVacancies.length === 1 ? "Vacancy" : "Vacancies"}
              </div>

              {filteredVacancies.map((vacancy) => {
                const isSelected =
                  selectedVacancy?.vacancyCode === vacancy.vacancyCode;

                return (
                  <div
                    key={vacancy.id}
                    onClick={() => handleSelectJob(vacancy)}
                    className={`p-5 rounded-2xl border transition-all cursor-pointer relative bg-white ${
                      isSelected
                        ? "border-[#4A7B5B] shadow-md ring-2 ring-[#4A7B5B]/15 bg-[#E8F3EC]/40"
                        : "border-slate-200/90 hover:border-[#4A7B5B]/50 hover:shadow-sm"
                    }`}
                  >
                    {/* Top Row: Title & Vacancy Code */}
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="min-w-0">
                        <h3 className="font-extrabold text-base text-slate-900 leading-snug line-clamp-2">
                          {vacancy.title}
                        </h3>
                        <p className="text-xs text-[#4A7B5B] font-semibold mt-0.5">
                          {vacancy.department}
                        </p>
                      </div>
                      <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 shrink-0 font-medium border border-slate-200">
                        {vacancy.vacancyCode}
                      </span>
                    </div>

                    {/* Metadata Badges */}
                    <div className="flex flex-wrap items-center gap-2 my-3 text-xs">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-medium">
                        <Briefcase className="w-3 h-3 text-slate-500" />
                        {labelFmt(vacancy.employmentType)}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-medium">
                        <Building2 className="w-3 h-3 text-slate-500" />
                        {labelFmt(vacancy.workMode)}
                      </span>
                      {vacancy.location && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-medium">
                          <MapPin className="w-3 h-3 text-slate-500" />
                          {vacancy.location}
                        </span>
                      )}
                    </div>

                    {/* Preview Info */}
                    {(vacancy.experience || vacancy.minimumQualification) && (
                      <p className="text-xs text-slate-600 line-clamp-1 mb-3">
                        <strong className="text-slate-700">Req:</strong>{" "}
                        {[vacancy.minimumQualification, vacancy.experience]
                          .filter(Boolean)
                          .join(" • ")}
                      </p>
                    )}

                    {/* Footer Row */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        {vacancy.numberOfPositions} Opening
                        {vacancy.numberOfPositions !== 1 ? "s" : ""}
                      </span>

                      <span className="inline-flex items-center gap-1 font-semibold text-[#4A7B5B]">
                        View Details
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right Column: Vacancy Details Panel (7 Cols) */}
            <div
              className={`lg:col-span-7 ${
                mobileDetailOpen ? "block" : "hidden lg:block"
              }`}
            >
              {selectedVacancy ? (
                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden lg:sticky lg:top-24">
                  {/* Mobile Back Button */}
                  <div className="lg:hidden p-4 bg-slate-100 border-b border-slate-200">
                    <button
                      onClick={() => setMobileDetailOpen(false)}
                      className="inline-flex items-center gap-1.5 text-sm font-bold text-[#4A7B5B]"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Back to all vacancies</span>
                    </button>
                  </div>

                  {/* Details Header Banner */}
                  <div className="p-6 sm:p-8 bg-gradient-to-br from-[#2D583C] to-[#1E3B29] text-white">
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-white/15 text-white/90 font-semibold border border-white/20">
                        {selectedVacancy.vacancyCode}
                      </span>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#F0AE1A] text-slate-950 font-bold">
                        {labelFmt(selectedVacancy.employmentType)}
                      </span>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/10 text-white font-medium border border-white/15">
                        {labelFmt(selectedVacancy.workMode)}
                      </span>
                    </div>

                    <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-snug">
                      {selectedVacancy.title}
                    </h1>

                    <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-slate-100 mt-3">
                      <span className="flex items-center gap-1.5">
                        <Building2 className="w-4 h-4 text-[#F0AE1A]" />
                        {selectedVacancy.department}
                      </span>
                      {selectedVacancy.location && (
                        <span className="flex items-center gap-1.5">
                          <MapPin className="w-4 h-4 text-[#F0AE1A]" />
                          {selectedVacancy.location}
                        </span>
                      )}
                      <span className="flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-[#F0AE1A]" />
                        {selectedVacancy.numberOfPositions} Opening
                        {selectedVacancy.numberOfPositions !== 1 ? "s" : ""}
                      </span>
                    </div>

                    {/* Prominent Header Action */}
                    <div className="mt-6 flex flex-wrap items-center gap-3">
                      <button
                        onClick={() => setApplyingVacancy(selectedVacancy)}
                        className="px-6 py-2.5 bg-[#F0AE1A] hover:bg-[#d89b14] text-slate-950 font-black rounded-xl text-sm shadow-md transition-all hover:scale-105 flex items-center gap-2"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>Apply Now</span>
                      </button>

                      <a
                        href={`mailto:${recruitmentEmail}?subject=Application for ${encodeURIComponent(selectedVacancy.title)} (${selectedVacancy.vacancyCode})`}
                        className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl text-xs border border-white/20 transition-colors flex items-center gap-1.5"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        <span>Email Resume</span>
                      </a>
                    </div>
                  </div>

                  {/* Send Resume To Callout Box (Requirement #5 & #6) */}
                  <div className="p-4 bg-[#E8F3EC] border-y border-[#4A7B5B]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-6 sm:px-8">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider text-[#355A42]">
                        Send Resume To:
                      </div>
                      <a
                        href={`mailto:${recruitmentEmail}`}
                        className="text-sm font-bold text-[#2A5239] hover:underline"
                      >
                        {recruitmentEmail}
                      </a>
                    </div>
                    <div className="text-[11px] text-[#4A7B5B] max-w-xs">
                      Official recruitment channel monitored by Swayam
                      Admission HR.
                    </div>
                  </div>

                  {/* Details Body */}
                  <div className="p-6 sm:p-8 space-y-6 text-sm text-slate-700 leading-relaxed max-h-[60vh] overflow-y-auto">
                    {/* Key Attributes Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <div>
                        <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 block">
                          Experience
                        </span>
                        <span className="font-bold text-slate-800">
                          {selectedVacancy.experience || "Not specified"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 block">
                          Qualification
                        </span>
                        <span className="font-bold text-slate-800">
                          {selectedVacancy.minimumQualification ||
                            "Graduate / Relevant"}
                        </span>
                      </div>
                      {(selectedVacancy.salaryMin ||
                        selectedVacancy.salaryMax) && (
                        <div>
                          <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 block">
                            Salary / CTC
                          </span>
                          <span className="font-bold text-[#4A7B5B]">
                            {selectedVacancy.salaryCurrency || "₹"}{" "}
                            {selectedVacancy.salaryMin?.toLocaleString("en-IN")}{" "}
                            {selectedVacancy.salaryMax
                              ? `- ${selectedVacancy.salaryMax?.toLocaleString("en-IN")}`
                              : "+"}
                          </span>
                        </div>
                      )}
                      {selectedVacancy.applicationDeadline && (
                        <div>
                          <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 block">
                            Apply Before
                          </span>
                          <span className="font-bold text-amber-600">
                            {new Date(
                              selectedVacancy.applicationDeadline,
                            ).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Job Description */}
                    {selectedVacancy.jobDescription && (
                      <div className="space-y-2">
                        <h3 className="text-base font-bold text-slate-900 border-b pb-1.5">
                          Job Description
                        </h3>
                        <div className="text-slate-600 whitespace-pre-wrap leading-relaxed">
                          {selectedVacancy.jobDescription}
                        </div>
                      </div>
                    )}

                    {/* Key Responsibilities */}
                    {selectedVacancy.responsibilities && (
                      <div className="space-y-2">
                        <h3 className="text-base font-bold text-slate-900 border-b pb-1.5">
                          Key Responsibilities
                        </h3>
                        <div className="text-slate-600 whitespace-pre-wrap leading-relaxed">
                          {selectedVacancy.responsibilities}
                        </div>
                      </div>
                    )}

                    {/* Qualifications & Requirements */}
                    {(selectedVacancy.minimumQualification ||
                      selectedVacancy.preferredQualification ||
                      selectedVacancy.educationRequirements) && (
                      <div className="space-y-2">
                        <h3 className="text-base font-bold text-slate-900 border-b pb-1.5">
                          Educational Qualifications
                        </h3>
                        <div className="space-y-1.5 text-slate-600">
                          {selectedVacancy.minimumQualification && (
                            <p>
                              <strong>Minimum Qualification:</strong>{" "}
                              {selectedVacancy.minimumQualification}
                            </p>
                          )}
                          {selectedVacancy.preferredQualification && (
                            <p>
                              <strong>Preferred Qualification:</strong>{" "}
                              {selectedVacancy.preferredQualification}
                            </p>
                          )}
                          {selectedVacancy.educationRequirements && (
                            <p className="whitespace-pre-wrap">
                              {selectedVacancy.educationRequirements}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Required Skills Tags */}
                    {selectedVacancy.requiredSkills &&
                      selectedVacancy.requiredSkills.length > 0 && (
                        <div className="space-y-2">
                          <h3 className="text-base font-bold text-slate-900 border-b pb-1.5">
                            Required Skills & Competencies
                          </h3>
                          <div className="flex flex-wrap gap-2 pt-1">
                            {selectedVacancy.requiredSkills.map((skill) => (
                              <span
                                key={skill}
                                className="px-3 py-1 bg-[#E8F3EC] text-[#2A5239] font-medium text-xs rounded-lg border border-[#CBD5E1]"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                    {/* Bottom CTA Box */}
                    <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 mt-8">
                      <div>
                        <div className="font-bold text-slate-900">
                          Ready to shape education?
                        </div>
                        <div className="text-xs text-slate-500">
                          Submit your application online or email your resume
                          directly.
                        </div>
                      </div>
                      <button
                        onClick={() => setApplyingVacancy(selectedVacancy)}
                        className="px-6 py-2.5 bg-[#4A7B5B] hover:bg-[#3D664A] text-white font-bold rounded-xl text-sm shadow-md transition-colors shrink-0"
                      >
                        Apply for this Role
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-sm text-slate-400">
                  Select a vacancy on the left to view full details.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 6. Apply Modal */}
      {applyingVacancy && (
        <CareersApplyModal
          vacancy={applyingVacancy}
          settings={settings}
          onClose={() => setApplyingVacancy(null)}
        />
      )}
    </div>
  );
}
