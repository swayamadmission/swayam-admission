import React from "react";
import {
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  CreditCard,
  Building2,
  Users,
  Award,
  Layers,
  Sparkles,
} from "lucide-react";
import { CollegePortalMetricsResponse } from "../../../api/colleges.api";

interface CollegePortalDashboardProps {
  data: CollegePortalMetricsResponse["data"] | null;
  loading: boolean;
  onNavigateTab: (tabId: string) => void;
}

export const CollegePortalDashboard: React.FC<CollegePortalDashboardProps> = ({
  data,
  loading,
  onNavigateTab,
}) => {
  if (loading || !data) {
    return (
      <div className="p-8 text-center text-[#64748B] flex items-center justify-center space-x-3">
        <div className="w-5 h-5 border-2 border-[#4A7B5B] border-t-transparent rounded-full animate-spin"></div>
        <span>Loading institutional portal metrics...</span>
      </div>
    );
  }

  const { college, metrics } = data;

  const cards = [
    {
      label: "Total Applications",
      value: metrics.totalApplications,
      icon: FileText,
      color: "#4A7B5B",
      bgColor: "#E8F3EC",
      tab: "applications",
    },
    {
      label: "Under Review / Intake",
      value: metrics.underReview + metrics.newApplications,
      icon: Clock,
      color: "#0EA5E9",
      bgColor: "#E0F2FE",
      tab: "applications",
    },
    {
      label: "Correction Required",
      value: metrics.correctionRequired,
      icon: AlertTriangle,
      color: "#F59E0B",
      bgColor: "#FEF3C7",
      tab: "applications",
    },
    {
      label: "Approved Admissions",
      value: metrics.approved,
      icon: CheckCircle2,
      color: "#10B981",
      bgColor: "#D1FAE5",
      tab: "applications",
    },
    {
      label: "Payment Pending",
      value: metrics.paymentPending,
      icon: CreditCard,
      color: "#8B5CF6",
      bgColor: "#EDE9FE",
      tab: "applications",
    },
    {
      label: "Confirmed Admissions",
      value: metrics.admissionConfirmed,
      icon: Award,
      color: "#4A7B5B",
      bgColor: "#E8F3EC",
      tab: "reporting",
    },
    {
      label: "Reporting Pending",
      value: metrics.reportingPending,
      icon: Clock,
      color: "#F59E0B",
      bgColor: "#FEF3C7",
      tab: "reporting",
    },
    {
      label: "Fully Enrolled Students",
      value: metrics.enrolled,
      icon: Users,
      color: "#4A7B5B",
      bgColor: "#F1F5F9",
      tab: "reporting",
    },
  ];

  const seatAccounting = metrics.seatAccounting || {
    totalSeats: 0,
    availableSeats: 0,
    consumedSeats: 0,
    reservedSeats: 0,
  };

  const occupancyRate =
    seatAccounting.totalSeats > 0
      ? Math.round((seatAccounting.consumedSeats / seatAccounting.totalSeats) * 100)
      : 0;

  return (
    <div className="space-y-6">
      {/* College Identity Banner */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-[#E8F3EC] flex items-center justify-center text-[#4A7B5B] font-bold text-xl border border-[#4A7B5B]/20 overflow-hidden">
            {college.logo ? (
              <img
                src={college.logo}
                alt={college.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <Building2 className="w-7 h-7" />
            )}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold text-[#4A7B5B]">{college.name}</h1>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                  college.status === "ACTIVE" || college.status === "PUBLISHED"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : college.status === "VERIFIED"
                    ? "bg-blue-50 text-blue-700 border border-blue-200"
                    : "bg-amber-50 text-amber-700 border border-amber-200"
                }`}
              >
                {college.status}
              </span>
              {college.verified && (
                <span className="bg-emerald-500/10 text-emerald-700 text-xs px-2 py-0.5 rounded-full flex items-center gap-1 font-medium border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Verified Partner
                </span>
              )}
            </div>
            <p className="text-sm text-[#64748B] mt-0.5">
              {college.city}, {college.state} • {college.email || "partner@institution.edu"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigateTab("offerings")}
            className="px-4 py-2 text-sm font-medium bg-[#E8F3EC] text-[#4A7B5B] hover:bg-[#D5EADB] rounded-xl transition flex items-center gap-1.5"
          >
            <Layers className="w-4 h-4" /> Manage Offerings
          </button>
          <button
            onClick={() => onNavigateTab("applications")}
            className="px-4 py-2 text-sm font-medium bg-[#4A7B5B] text-white hover:bg-[#3D674C] rounded-xl shadow-sm transition flex items-center gap-1.5"
          >
            <FileText className="w-4 h-4" /> Admission Queue
          </button>
        </div>
      </div>

      {/* Seat Capacity & Intake KPI Card */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-gradient-to-br from-[#4A7B5B] to-[#1E293B] text-white p-6 rounded-2xl shadow-sm">
        <div className="space-y-1">
          <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">
            Total Academic Seats
          </span>
          <div className="text-3xl font-bold">{seatAccounting.totalSeats}</div>
          <span className="text-xs text-slate-400">
            Across {metrics.activeOfferingsCount} Active Programs
          </span>
        </div>
        <div className="space-y-1">
          <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">
            Allocated / Consumed
          </span>
          <div className="text-3xl font-bold text-amber-400">
            {seatAccounting.consumedSeats}
          </div>
          <span className="text-xs text-slate-400">
            {occupancyRate}% Occupancy Rate
          </span>
        </div>
        <div className="space-y-1">
          <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">
            Available Remaining
          </span>
          <div className="text-3xl font-bold text-emerald-400">
            {seatAccounting.availableSeats}
          </div>
          <span className="text-xs text-slate-400">Real-Time Open Capacity</span>
        </div>
        <div className="space-y-1">
          <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">
            Quota / Reserved
          </span>
          <div className="text-3xl font-bold text-blue-400">
            {seatAccounting.reservedSeats}
          </div>
          <span className="text-xs text-slate-400">Management & Reserved</span>
        </div>
      </div>

      {/* Real-time Status Metric Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <button
              key={idx}
              onClick={() => onNavigateTab(card.tab)}
              className="bg-white border border-[#E2E8F0] hover:border-[#4A7B5B]/40 hover:shadow-md p-5 rounded-2xl text-left transition duration-150 flex flex-col justify-between group"
            >
              <div className="flex items-center justify-between mb-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: card.bgColor, color: card.color }}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-xs font-semibold text-[#64748B] group-hover:text-[#4A7B5B] transition">
                  View &rarr;
                </span>
              </div>
              <div>
                <div className="text-2xl font-bold text-[#4A7B5B]">{card.value}</div>
                <div className="text-xs text-[#64748B] font-medium mt-1">
                  {card.label}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
