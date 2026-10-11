import React, { useState } from "react";
import { useParams, Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Briefcase,
  MapPin,
  Clock,
  ArrowLeft,
  Building2,
  Users,
  Calendar,
  IndianRupee,
  Mail,
  Sparkles,
} from "lucide-react";
import { careersApi, Vacancy } from "../../api/careers.api";
import CareersApplyModal from "./CareersApplyModal";

const labelFmt = (s?: string) =>
  s ? s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "";

export default function CareerDetailPage() {
  const { code } = useParams<{ code: string }>();
  const [showApplyModal, setShowApplyModal] = useState(false);

  // 1. Fetch recruitment settings
  const { data: settingsRes } = useQuery({
    queryKey: ["careers_public_settings"],
    queryFn: careersApi.getSettings,
    staleTime: 5 * 60 * 1000,
  });
  const settings = settingsRes?.data;
  const recruitmentEmail =
    settings?.recruitmentEmail || "careers@swayamadmission.com";

  // 2. Fetch vacancy
  const { data: vacancyRes, isLoading } = useQuery({
    queryKey: ["careers_vacancy", code],
    queryFn: () => careersApi.getVacancy(code!),
    enabled: !!code,
  });

  const vacancy = vacancyRes?.data;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center pt-20">
        <div className="w-10 h-10 border-4 border-[#4A7B5B] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!vacancy) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center pt-20 px-4 text-center">
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-4">
          <Briefcase className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">
          Position Not Found
        </h2>
        <p className="text-slate-600 mb-6 max-w-md">
          The job vacancy you are looking for does not exist or is no longer
          open for applications.
        </p>
        <Link
          to="/careers"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#4A7B5B] text-white font-bold rounded-xl text-sm shadow hover:bg-[#3D664A] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to All Careers
        </Link>
      </div>
    );
  }

  const isExpired = vacancy.applicationEndDate
    ? new Date() > new Date(vacancy.applicationEndDate)
    : false;
  const isStarted = vacancy.applicationStartDate
    ? new Date() >= new Date(vacancy.applicationStartDate)
    : true;
  const canApply = vacancy.status === "PUBLISHED" && !isExpired && isStarted;

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col pt-16 sm:pt-20">
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-[#2D583C] to-[#1E3B29] text-white py-12 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <Link
            to="/careers"
            className="inline-flex items-center text-white/80 hover:text-white mb-6 text-xs sm:text-sm font-semibold transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to all open positions
          </Link>

          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-white/15 text-white/90 font-semibold border border-white/20">
                  {vacancy.vacancyCode}
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#F0AE1A] text-slate-950 font-bold">
                  {labelFmt(vacancy.employmentType)}
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/10 text-white font-medium border border-white/15">
                  {labelFmt(vacancy.workMode)}
                </span>
              </div>

              <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-snug">
                {vacancy.title}
              </h1>

              <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-slate-100 mt-3">
                <span className="flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-[#F0AE1A]" />
                  {vacancy.department}
                </span>
                {vacancy.location && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-[#F0AE1A]" />
                    {vacancy.location}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-[#F0AE1A]" />
                  {vacancy.numberOfPositions} Opening
                  {vacancy.numberOfPositions !== 1 ? "s" : ""}
                </span>
              </div>
            </div>

            {/* Apply Button */}
            <div className="shrink-0 flex items-center gap-3">
              {canApply ? (
                <button
                  onClick={() => setShowApplyModal(true)}
                  className="px-8 py-3 bg-[#F0AE1A] hover:bg-[#d89b14] text-slate-950 font-black rounded-xl text-base shadow-lg transition-transform hover:scale-105 flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Apply Now</span>
                </button>
              ) : (
                <div className="px-6 py-3 bg-white/20 text-white rounded-xl text-sm font-semibold border border-white/30 backdrop-blur-sm">
                  Applications Closed
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Send Resume To Strip */}
      <div className="bg-[#E8F3EC] border-y border-[#4A7B5B]/20 py-3.5 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div>
            <span className="font-bold text-[#355A42] uppercase tracking-wider mr-2">
              Send Resume To:
            </span>
            <a
              href={`mailto:${recruitmentEmail}`}
              className="font-bold text-[#2A5239] hover:underline text-sm"
            >
              {recruitmentEmail}
            </a>
          </div>
          <span className="text-[#4A7B5B]">
            Official Swayam Admission Careers portal.
          </span>
        </div>
      </div>

      {/* Main Body */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 w-full flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Job Description */}
            {vacancy.jobDescription && (
              <section className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/90 shadow-sm space-y-3">
                <h2 className="text-lg font-bold text-slate-900 border-b pb-2">
                  About the Role
                </h2>
                <div className="text-slate-600 whitespace-pre-wrap leading-relaxed text-sm">
                  {vacancy.jobDescription}
                </div>
              </section>
            )}

            {/* Responsibilities */}
            {vacancy.responsibilities && (
              <section className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/90 shadow-sm space-y-3">
                <h2 className="text-lg font-bold text-slate-900 border-b pb-2">
                  Key Responsibilities
                </h2>
                <div className="text-slate-600 whitespace-pre-wrap leading-relaxed text-sm">
                  {vacancy.responsibilities}
                </div>
              </section>
            )}

            {/* Qualifications */}
            {(vacancy.minimumQualification ||
              vacancy.preferredQualification ||
              vacancy.educationRequirements) && (
              <section className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/90 shadow-sm space-y-3">
                <h2 className="text-lg font-bold text-slate-900 border-b pb-2">
                  Qualifications & Requirements
                </h2>
                <div className="space-y-2 text-sm text-slate-600">
                  {vacancy.minimumQualification && (
                    <p>
                      <strong>Minimum Qualification:</strong>{" "}
                      {vacancy.minimumQualification}
                    </p>
                  )}
                  {vacancy.preferredQualification && (
                    <p>
                      <strong>Preferred Qualification:</strong>{" "}
                      {vacancy.preferredQualification}
                    </p>
                  )}
                  {vacancy.educationRequirements && (
                    <p className="whitespace-pre-wrap">
                      {vacancy.educationRequirements}
                    </p>
                  )}
                </div>
              </section>
            )}

            {/* Skills */}
            {((vacancy.requiredSkills && vacancy.requiredSkills.length > 0) ||
              (vacancy.preferredSkills &&
                vacancy.preferredSkills.length > 0)) && (
              <section className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/90 shadow-sm space-y-3">
                <h2 className="text-lg font-bold text-slate-900 border-b pb-2">
                  Skills & Competencies
                </h2>
                <div className="flex flex-wrap gap-2 pt-1">
                  {vacancy.requiredSkills?.map((skill) => (
                    <span
                      key={skill}
                      className="px-3 py-1 bg-[#E8F3EC] text-[#2A5239] font-medium text-xs rounded-lg border border-[#CBD5E1]"
                    >
                      {skill}
                    </span>
                  ))}
                  {vacancy.preferredSkills?.map((skill) => (
                    <span
                      key={skill}
                      className="px-3 py-1 bg-slate-100 text-slate-700 font-medium text-xs rounded-lg border border-slate-200"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Sidebar Overview Column */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-4">
              <h3 className="font-bold text-slate-900 text-base border-b pb-2">
                Job Overview
              </h3>

              <div className="space-y-3.5 text-xs sm:text-sm">
                <div>
                  <span className="text-slate-400 font-medium block text-xs">
                    Job Code
                  </span>
                  <span className="font-mono font-bold text-slate-800">
                    {vacancy.vacancyCode}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block text-xs">
                    Designation
                  </span>
                  <span className="font-semibold text-slate-800">
                    {vacancy.designation}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block text-xs">
                    Openings
                  </span>
                  <span className="font-semibold text-slate-800">
                    {vacancy.numberOfPositions} Position
                    {vacancy.numberOfPositions !== 1 ? "s" : ""}
                  </span>
                </div>
                {vacancy.experience && (
                  <div>
                    <span className="text-slate-400 font-medium block text-xs">
                      Experience
                    </span>
                    <span className="font-semibold text-slate-800">
                      {vacancy.experience}
                    </span>
                  </div>
                )}
                {(vacancy.salaryMin || vacancy.salaryMax) && (
                  <div>
                    <span className="text-slate-400 font-medium block text-xs">
                      Salary / CTC
                    </span>
                    <span className="font-bold text-[#4A7B5B]">
                      {vacancy.salaryCurrency || "₹"}{" "}
                      {vacancy.salaryMin?.toLocaleString("en-IN")}{" "}
                      {vacancy.salaryMax
                        ? `- ${vacancy.salaryMax?.toLocaleString("en-IN")}`
                        : "+"}
                    </span>
                  </div>
                )}
                {vacancy.applicationDeadline && (
                  <div>
                    <span className="text-slate-400 font-medium block text-xs">
                      Application Deadline
                    </span>
                    <span className="font-bold text-amber-600">
                      {new Date(
                        vacancy.applicationDeadline,
                      ).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                )}
              </div>

              {canApply && (
                <div className="pt-4 border-t">
                  <button
                    onClick={() => setShowApplyModal(true)}
                    className="w-full py-2.5 bg-[#4A7B5B] hover:bg-[#3D664A] text-white font-bold rounded-xl text-sm shadow transition-colors"
                  >
                    Apply Now
                  </button>
                </div>
              )}
            </div>

            {/* Need Assistance Card */}
            <div className="bg-[#E8F3EC]/50 border border-[#4A7B5B]/30 rounded-2xl p-6 text-center space-y-2">
              <h4 className="font-bold text-slate-900 text-sm">
                Questions about this role?
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Connect directly with our recruitment team for clarifications
                or support.
              </p>
              <div className="pt-2">
                <a
                  href={`mailto:${recruitmentEmail}`}
                  className="text-xs font-bold text-[#4A7B5B] hover:underline"
                >
                  {recruitmentEmail}
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Apply Modal */}
      {showApplyModal && (
        <CareersApplyModal
          vacancy={vacancy}
          settings={settings}
          onClose={() => setShowApplyModal(false)}
        />
      )}
    </div>
  );
}
