import React, { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Layers,
  FileText,
  Users,
  FolderOpen,
  Award,
  Building2,
  CheckCircle2,
  ChevronDown,
} from "lucide-react";
import { collegesApi, College, CollegePortalMetricsResponse } from "../../../api/colleges.api";
import { CollegePortalDashboard } from "./CollegePortalDashboard";
import { OfferingsManager } from "./OfferingsManager";
import { CollegeApplicationQueue } from "./CollegeApplicationQueue";
import { CollegeStaffManager } from "./CollegeStaffManager";
import { CollegeDocumentsManager } from "./CollegeDocumentsManager";
import { CollegeReportingEnrollment } from "./CollegeReportingEnrollment";
import { PartnerProfileManager } from "./PartnerProfileManager";

export const CollegePortalPage: React.FC = () => {
  const [colleges, setColleges] = useState<College[]>([]);
  const [selectedCollegeId, setSelectedCollegeId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [portalData, setPortalData] = useState<CollegePortalMetricsResponse["data"] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Load authorized colleges
  const loadColleges = async () => {
    try {
      setLoading(true);
      const res = await collegesApi.findAll({ limit: 100 });
      if (res.data?.data) {
        const list = res.data.data;
        setColleges(list);
        if (list.length > 0 && !selectedCollegeId) {
          setSelectedCollegeId(list[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to fetch colleges", err);
    } finally {
      setLoading(false);
    }
  };

  const loadPortalMetrics = async (id: string) => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await collegesApi.getPortalMetrics(id);
      if (res.data?.success) {
        setPortalData(res.data.data);
      }
    } catch (err) {
      console.error("Failed to load portal metrics", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadColleges();
  }, []);

  useEffect(() => {
    if (selectedCollegeId) {
      loadPortalMetrics(selectedCollegeId);
    }
  }, [selectedCollegeId]);

  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "profile", label: "College Profile", icon: Building2 },
    { id: "offerings", label: "Programs & Seat Matrix", icon: Layers },
    { id: "applications", label: "Admission Queue", icon: FileText },
    { id: "reporting", label: "Reporting & Enrollment", icon: Award },
    { id: "staff", label: "College Staff & IAM", icon: Users },
    { id: "documents", label: "Accreditation Vault", icon: FolderOpen },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* College Switcher Bar for Super Admins / Multi-College Users */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-[#E8F3EC] flex items-center justify-center text-[#4A7B5B]">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider block">
              Active College Organization
            </span>
            <div className="font-bold text-[#4A7B5B] text-base flex items-center gap-2">
              {colleges.length > 1 ? (
                <select
                  value={selectedCollegeId}
                  onChange={(e) => setSelectedCollegeId(e.target.value)}
                  className="bg-transparent font-bold text-[#4A7B5B] focus:outline-none cursor-pointer border-b border-dashed border-[#4A7B5B] py-0.5"
                >
                  {colleges.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.city}, {c.state})
                    </option>
                  ))}
                </select>
              ) : (
                <span>{portalData?.college?.name || "Institution Partner"}</span>
              )}
            </div>
          </div>
        </div>

        {/* Tab Navigation Buttons */}
        <div className="flex items-center gap-1 bg-[#F8FAFC] p-1 rounded-xl border border-[#E2E8F0] overflow-x-auto max-w-full">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 whitespace-nowrap ${
                  isActive
                    ? "bg-white text-[#4A7B5B] shadow-sm border border-[#E2E8F0]"
                    : "text-[#64748B] hover:text-[#4A7B5B]"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Panels */}
      <div>
        {activeTab === "dashboard" && (
          <CollegePortalDashboard
            data={portalData}
            loading={loading}
            onNavigateTab={(tab) => setActiveTab(tab)}
          />
        )}

        {activeTab === "profile" && selectedCollegeId && (
          <PartnerProfileManager collegeId={selectedCollegeId} />
        )}

        {activeTab === "offerings" && selectedCollegeId && (
          <OfferingsManager collegeId={selectedCollegeId} />
        )}

        {activeTab === "applications" && selectedCollegeId && (
          <CollegeApplicationQueue collegeId={selectedCollegeId} />
        )}

        {activeTab === "reporting" && selectedCollegeId && (
          <CollegeReportingEnrollment collegeId={selectedCollegeId} />
        )}

        {activeTab === "staff" && selectedCollegeId && (
          <CollegeStaffManager collegeId={selectedCollegeId} />
        )}

        {activeTab === "documents" && selectedCollegeId && (
          <CollegeDocumentsManager collegeId={selectedCollegeId} />
        )}
      </div>
    </div>
  );
};
