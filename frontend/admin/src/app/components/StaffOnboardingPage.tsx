import { useState, useEffect } from "react";
import {
  Users,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Filter,
  Eye,
  Lock,
  KeyRound,
  FileText,
  AlertTriangle,
  RefreshCw,
  Copy,
  Check,
  UserCheck,
  UserX,
  Building,
  Mail,
  Phone,
  ShieldAlert,
  ChevronRight,
  Shield,
  Loader2,
  Download,
} from "lucide-react";
import {
  staffOnboardingApi,
  StaffRegistrationItem,
} from "../../api/staff-onboarding.api";
import { positionsApi, PositionItem } from "../../api/positions.api";
import { organizationApi, Department, Unit } from "../../api/organization.api";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";

export default function StaffOnboardingPage() {
  const [requests, setRequests] = useState<StaffRegistrationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [approvalFilter, setApprovalFilter] = useState("ALL");
  const [kycFilter, setKycFilter] = useState("ALL");

  // Selected Request for Review / Approval Drawer
  const [selectedRequest, setSelectedRequest] = useState<StaffRegistrationItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Departments & Positions for Approval Form
  const [departments, setDepartments] = useState<Department[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [positions, setPositions] = useState<PositionItem[]>([]);
  const [approvalForm, setApprovalForm] = useState({
    departmentId: "",
    unitId: "",
    positionId: "",
    temporaryPassword: "",
    forcePasswordChange: true,
  });

  // Rejection Modal
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  // KYC Reject Modal
  const [kycRejectModalOpen, setKycRejectModalOpen] = useState(false);
  const [kycRejectReason, setKycRejectReason] = useState("");
  const [selectedKycDocId, setSelectedKycDocId] = useState<string | undefined>();

  // Security Operations Modal
  const [securityModalOpen, setSecurityModalOpen] = useState(false);
  const [securityTargetUser, setSecurityTargetUser] = useState<any>(null);
  const [securityTab, setSecurityTab] = useState<
    "reset_password" | "change_password" | "revoke_sessions" | "lock" | "resign"
  >("reset_password");
  const [passwordResetReason, setPasswordResetReason] = useState("Security Incident");
  const [passwordResetCustomReason, setPasswordResetCustomReason] = useState("");
  const [customTempPassword, setCustomTempPassword] = useState("");
  const [resetSuccessData, setResetSuccessData] = useState<{
    temporaryPassword?: string;
    message?: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [generalSecurityReason, setGeneralSecurityReason] = useState("");
  const [resignationNotes, setResignationNotes] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await staffOnboardingApi.getRequests({
        approvalStatus: approvalFilter,
        kycStatus: kycFilter,
        search: search.trim() || undefined,
      });
      setRequests(res.data);
    } catch (err) {
      console.error("Failed to load staff requests", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [approvalFilter, kycFilter]);

  useEffect(() => {
    // Preload departments and positions
    organizationApi
      .getDepartments()
      .then((depts) => {
        setDepartments(depts);
        if (depts.length > 0) {
          setApprovalForm((f) => ({ ...f, departmentId: depts[0].id }));
        }
      })
      .catch((err) => console.error("Error loading departments", err));

    positionsApi
      .getPositions()
      .then((pos) => setPositions(pos))
      .catch((err) => console.error("Error loading positions", err));
  }, []);

  const handleDeptChange = async (deptId: string) => {
    setApprovalForm((f) => ({ ...f, departmentId: deptId, unitId: "" }));
    if (deptId) {
      try {
        const u = await organizationApi.getUnits({ departmentId: deptId });
        setUnits(u);
      } catch (err) {
        console.error("Error loading units", err);
      }
    } else {
      setUnits([]);
    }
  };

  const handleOpenReview = async (reqItem: StaffRegistrationItem) => {
    try {
      const fullDetail = await staffOnboardingApi.getRequestById(reqItem.id);
      setSelectedRequest(fullDetail);
      // Auto-generate a secure temporary password suggestion
      const randomTemp = `Sw@yam${Math.random().toString(36).slice(-5)}99!`;
      setApprovalForm((f) => ({
        ...f,
        temporaryPassword: randomTemp,
      }));
      setDrawerOpen(true);
    } catch (err) {
      console.error("Error opening request detail", err);
    }
  };

  const handleVerifyKyc = async (action: "APPROVE" | "REJECT", docId?: string) => {
    if (!selectedRequest) return;
    if (action === "REJECT" && !kycRejectReason.trim()) {
      alert("Please provide a rejection reason for KYC.");
      return;
    }

    setActionLoading(true);
    try {
      await staffOnboardingApi.verifyKyc(selectedRequest.id, {
        action,
        documentId: docId,
        rejectionReason: action === "REJECT" ? kycRejectReason.trim() : undefined,
      });
      setKycRejectModalOpen(false);
      setKycRejectReason("");
      // Refresh request
      const updated = await staffOnboardingApi.getRequestById(selectedRequest.id);
      setSelectedRequest(updated);
      loadData();
    } catch (err: any) {
      alert(err?.response?.data?.message || "Failed to update KYC status.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveStaff = async () => {
    if (!selectedRequest || !approvalForm.departmentId) {
      alert("Please select a department for the candidate.");
      return;
    }

    setActionLoading(true);
    try {
      await staffOnboardingApi.approveStaff(selectedRequest.id, {
        departmentId: approvalForm.departmentId,
        unitId: approvalForm.unitId || undefined,
        positionId: approvalForm.positionId || undefined,
        temporaryPassword: approvalForm.temporaryPassword.trim() || undefined,
        forcePasswordChange: approvalForm.forcePasswordChange,
      });

      alert(
        `Staff member '${selectedRequest.fullName}' approved successfully! Position and Company Email activated.`,
      );
      setDrawerOpen(false);
      loadData();
    } catch (err: any) {
      alert(err?.response?.data?.message || "Approval failed.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectStaff = async () => {
    if (!selectedRequest || !rejectReason.trim()) {
      alert("Please provide a rejection reason.");
      return;
    }

    setActionLoading(true);
    try {
      await staffOnboardingApi.rejectStaff(selectedRequest.id, {
        reason: rejectReason.trim(),
      });
      setRejectModalOpen(false);
      setRejectReason("");
      setDrawerOpen(false);
      loadData();
    } catch (err: any) {
      alert(err?.response?.data?.message || "Rejection failed.");
    } finally {
      setActionLoading(false);
    }
  };

  // Security operations handlers
  const handleOpenSecurityModal = (user: any) => {
    setSecurityTargetUser(user);
    setSecurityTab("reset_password");
    setPasswordResetReason("Security Incident");
    setPasswordResetCustomReason("");
    const randomTemp = `Sw@yam${Math.random().toString(36).slice(-5)}88!`;
    setCustomTempPassword(randomTemp);
    setResetSuccessData(null);
    setSecurityModalOpen(true);
  };

  const handleExecutePasswordReset = async () => {
    if (!securityTargetUser) return;
    if (passwordResetReason === "Other" && !passwordResetCustomReason.trim()) {
      alert("Please enter custom reason for password reset.");
      return;
    }

    setActionLoading(true);
    try {
      const res = await staffOnboardingApi.adminPasswordReset(
        securityTargetUser.id,
        {
          reason: passwordResetReason,
          customReason: passwordResetCustomReason.trim() || undefined,
          temporaryPassword: customTempPassword.trim() || undefined,
          forcePasswordChange: true,
        },
      );
      setResetSuccessData({
        temporaryPassword: res.temporaryPassword,
        message: res.message,
      });
      loadData();
    } catch (err: any) {
      alert(err?.response?.data?.message || "Password reset failed.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleExecuteSessionRevocation = async () => {
    if (!securityTargetUser) return;
    setActionLoading(true);
    try {
      await staffOnboardingApi.revokeSessions(
        securityTargetUser.id,
        generalSecurityReason.trim() || "Administrative security operation",
      );
      alert(
        `All active sessions revoked for ${securityTargetUser.fullName}. User is logged out across all devices.`,
      );
      setSecurityModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err?.response?.data?.message || "Session revocation failed.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleExecuteLockToggle = async (isCurrentlyLocked: boolean) => {
    if (!securityTargetUser) return;
    setActionLoading(true);
    try {
      if (isCurrentlyLocked) {
        await staffOnboardingApi.unlockAccount(securityTargetUser.id);
        alert(`Account unlocked for ${securityTargetUser.fullName}.`);
      } else {
        await staffOnboardingApi.lockAccount(
          securityTargetUser.id,
          generalSecurityReason.trim() || "Security review in progress",
        );
        alert(`Account locked for ${securityTargetUser.fullName}.`);
      }
      setSecurityModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err?.response?.data?.message || "Lock operation failed.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleExecuteResignation = async () => {
    if (!securityTargetUser) return;
    if (
      !confirm(
        `Are you sure you want to process resignation for ${securityTargetUser.fullName}? This will revoke their corporate post login, invalidate sessions, and vacate the position while retaining the continuous company email.`,
      )
    )
      return;

    setActionLoading(true);
    try {
      await staffOnboardingApi.resignStaff(securityTargetUser.id, {
        reason: "Employee Resignation",
        handoverNotes: resignationNotes.trim() || undefined,
      });
      alert(
        `Resignation processed for ${securityTargetUser.fullName}. Corporate post and company email preserved for replacement.`,
      );
      setSecurityModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err?.response?.data?.message || "Resignation process failed.");
    } finally {
      setActionLoading(false);
    }
  };

  // Metrics
  const pendingCount = requests.filter((r) => r.approvalStatus === "PENDING").length;
  const verifiedKycCount = requests.filter((r) => r.kycStatus === "VERIFIED").length;
  const approvedCount = requests.filter((r) => r.approvalStatus === "APPROVED").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#4A7B5B] tracking-tight">
            Staff Onboarding & Confidential KYC Governance
          </h1>
          <p className="text-sm text-[#64748B] mt-0.5">
            Role whitelist governance, candidate KYC verification, position binding, and admin security password management.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            className="flex items-center gap-1.5 text-xs h-9 border-[#CBD5E1]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-[#4A7B5B]">{pendingCount}</div>
            <div className="text-xs text-[#64748B] font-medium">
              Pending Onboarding Requests
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-[#4A7B5B]">{verifiedKycCount}</div>
            <div className="text-xs text-[#64748B] font-medium">
              Verified Candidate KYCs
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-[#4A7B5B]">{approvedCount}</div>
            <div className="text-xs text-[#64748B] font-medium">
              Active Post Holders Approved
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
            <Input
              placeholder="Search by candidate name, email, or mobile..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") loadData();
              }}
              className="pl-9 h-10 border-[#CBD5E1] text-xs"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={approvalFilter}
              onChange={(e) => setApprovalFilter(e.target.value)}
              className="h-10 px-3 text-xs border border-[#CBD5E1] rounded-lg bg-white text-[#4A7B5B] focus:outline-none focus:border-[#4A7B5B]"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending Approval</option>
              <option value="APPROVED">Approved Staff</option>
              <option value="REJECTED">Rejected</option>
            </select>

            <select
              value={kycFilter}
              onChange={(e) => setKycFilter(e.target.value)}
              className="h-10 px-3 text-xs border border-[#CBD5E1] rounded-lg bg-white text-[#4A7B5B] focus:outline-none focus:border-[#4A7B5B]"
            >
              <option value="ALL">All KYC</option>
              <option value="VERIFIED">KYC Verified</option>
              <option value="PENDING">KYC Under Review</option>
              <option value="NOT_SUBMITTED">Not Submitted</option>
              <option value="REJECTED">KYC Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                <th className="py-3 px-4">Candidate Profile</th>
                <th className="py-3 px-4">Applying Role</th>
                <th className="py-3 px-4">Region / District</th>
                <th className="py-3 px-4">KYC Status</th>
                <th className="py-3 px-4">Approval Status</th>
                <th className="py-3 px-4">Post & Company Email</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-xs">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#64748B]">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#4A7B5B]" />
                    Loading staff requests...
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#64748B]">
                    No staff onboarding requests found matching criteria.
                  </td>
                </tr>
              ) : (
                requests.map((item) => {
                  const isApproved = item.approvalStatus === "APPROVED";
                  const isPending = item.approvalStatus === "PENDING";
                  const isRejected = item.approvalStatus === "REJECTED";

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-[#F8FAFC]/80 transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-[#4A7B5B]">
                          {item.fullName}
                        </div>
                        <div className="text-[11px] text-[#64748B] flex items-center gap-2 mt-0.5">
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" /> {item.personalEmail}
                          </span>
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {item.personalMobile}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <Badge
                          variant="outline"
                          className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[11px] font-medium"
                        >
                          {item.requestedRoleSlug === "senior-counselor"
                            ? "Senior Counselor"
                            : "Counselor"}
                        </Badge>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-medium text-[#4A7B5B]">
                          {item.requestedState?.name || "All India"}
                        </div>
                        <div className="text-[11px] text-[#64748B]">
                          {item.requestedDistrict?.name
                            ? `District: ${item.requestedDistrict.name}`
                            : "State-wide"}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {item.kycStatus === "VERIFIED" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                            <ShieldCheck className="w-3.5 h-3.5" /> Verified
                          </span>
                        )}
                        {item.kycStatus === "PENDING" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800">
                            <Clock className="w-3.5 h-3.5" /> Under Review
                          </span>
                        )}
                        {item.kycStatus === "NOT_SUBMITTED" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-700">
                            Not Uploaded
                          </span>
                        )}
                        {item.kycStatus === "REJECTED" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-red-100 text-red-800">
                            <XCircle className="w-3.5 h-3.5" /> Rejected
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {isApproved && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Approved
                          </span>
                        )}
                        {isPending && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-800">
                            <Clock className="w-3.5 h-3.5" /> Pending
                          </span>
                        )}
                        {isRejected && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800">
                            <XCircle className="w-3.5 h-3.5" /> Rejected
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {item.assignedPosition ? (
                          <div>
                            <div className="font-semibold text-emerald-700 flex items-center gap-1">
                              <Building className="w-3.5 h-3.5" />
                              {item.assignedPosition.code}
                            </div>
                            <div className="text-[11px] text-[#64748B] font-mono">
                              {item.assignedPosition.companyEmail}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">Not Assigned</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenReview(item)}
                            className="h-8 text-xs font-medium border-emerald-300 text-emerald-800 hover:bg-emerald-50"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" />
                            {isApproved ? "View Profile" : "Review & Approve"}
                          </Button>

                          {item.user && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenSecurityModal(item.user)}
                              className="h-8 text-xs font-medium border-amber-300 text-amber-800 hover:bg-amber-50"
                              title="Security operations & admin password reset"
                            >
                              <KeyRound className="w-3.5 h-3.5 mr-1" />
                              Security
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* === REVIEW & APPROVAL DRAWER === */}
      {drawerOpen && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex justify-end">
          <div className="bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-5 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
              <div>
                <h3 className="text-lg font-bold text-[#4A7B5B]">
                  Candidate Onboarding: {selectedRequest.fullName}
                </h3>
                <p className="text-xs text-[#64748B]">
                  Request ID: {selectedRequest.id} • Submitted:{" "}
                  {new Date(selectedRequest.submittedAt).toLocaleDateString()}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDrawerOpen(false)}
                className="h-8 w-8 p-0"
              >
                ✕
              </Button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 p-6 overflow-y-auto space-y-6">
              {/* Candidate Info Card */}
              <div className="bg-[#F8FAFC] p-4 rounded-xl border border-[#E2E8F0] space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
                  Candidate Details
                </h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[#64748B] block">Personal Email:</span>
                    <span className="font-semibold text-[#4A7B5B]">
                      {selectedRequest.personalEmail}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#64748B] block">Personal Mobile:</span>
                    <span className="font-semibold text-[#4A7B5B]">
                      {selectedRequest.personalMobile}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#64748B] block">Applying Role:</span>
                    <span className="font-semibold text-[#4A7B5B]">
                      {selectedRequest.requestedRoleSlug === "senior-counselor"
                        ? "Senior Counselor (Regional Seat)"
                        : "Counselor"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#64748B] block">Target District:</span>
                    <span className="font-semibold text-[#4A7B5B]">
                      {selectedRequest.requestedDistrict?.name || "General Region"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Confidential KYC Documents Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#64748B] flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-emerald-600" />
                    Confidential KYC Documents
                  </h4>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleVerifyKyc("APPROVE")}
                      disabled={actionLoading}
                      className="h-7 text-xs bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                      Verify All KYC
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedKycDocId(undefined);
                        setKycRejectModalOpen(true);
                      }}
                      disabled={actionLoading}
                      className="h-7 text-xs bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                    >
                      <XCircle className="w-3.5 h-3.5 mr-1" />
                      Reject KYC
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  {selectedRequest.user?.staffKycDocuments &&
                  selectedRequest.user.staffKycDocuments.length > 0 ? (
                    selectedRequest.user.staffKycDocuments.map((doc: any) => (
                      <div
                        key={doc.id}
                        className="p-3 bg-white border border-[#E2E8F0] rounded-xl flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-semibold text-[#4A7B5B] flex items-center gap-2">
                            <span>{doc.documentType} Card</span>
                            <Badge
                              variant="outline"
                              className={
                                doc.status === "VERIFIED"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]"
                                  : doc.status === "REJECTED"
                                  ? "bg-rose-50 text-rose-700 border-rose-200 text-[10px]"
                                  : "bg-amber-50 text-amber-700 border-amber-200 text-[10px]"
                              }
                            >
                              {doc.status}
                            </Badge>
                          </div>
                          <div className="text-[#64748B] text-[11px] mt-0.5">
                            Number:{" "}
                            <span className="font-mono font-medium">
                              {doc.documentNumber || "Masked"}
                            </span>{" "}
                            • File: {doc.fileName}
                          </div>
                          {doc.rejectionReason && (
                            <div className="text-rose-600 text-[11px] mt-1">
                              Reason: {doc.rejectionReason}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleVerifyKyc("APPROVE", doc.id)}
                            className="h-7 text-xs text-emerald-700 hover:bg-emerald-50"
                          >
                            Verify
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedKycDocId(doc.id);
                              setKycRejectModalOpen(true);
                            }}
                            className="h-7 text-xs text-rose-700 hover:bg-rose-50"
                          >
                            Reject
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl text-center text-xs text-gray-500">
                      No KYC documents submitted yet.
                    </div>
                  )}
                </div>
              </div>

              {/* Approval & Position Binding Workflow */}
              {selectedRequest.approvalStatus === "PENDING" && (
                <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200 space-y-4">
                  <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                    <Building className="w-4 h-4 text-emerald-700" />
                    <span>Approve & Bind Organizational Position</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <Label className="text-xs mb-1 block">Department *</Label>
                      <select
                        value={approvalForm.departmentId}
                        onChange={(e) => handleDeptChange(e.target.value)}
                        className="w-full h-9 px-2 text-xs border border-[#CBD5E1] rounded-lg bg-white"
                      >
                        {departments.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name} ({d.code})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label className="text-xs mb-1 block">Select Position (Optional)</Label>
                      <select
                        value={approvalForm.positionId}
                        onChange={(e) =>
                          setApprovalForm((f) => ({ ...f, positionId: e.target.value }))
                        }
                        className="w-full h-9 px-2 text-xs border border-[#CBD5E1] rounded-lg bg-white"
                      >
                        <option value="">Auto-create new continuous post</option>
                        {positions
                          .filter((p) => p.isVacant)
                          .map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.code} — {p.title} ({p.companyEmail})
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-[#4A7B5B] block">
                      Initial Temporary Password for Candidate
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        value={approvalForm.temporaryPassword}
                        onChange={(e) =>
                          setApprovalForm((f) => ({
                            ...f,
                            temporaryPassword: e.target.value,
                          }))
                        }
                        className="h-9 text-xs border-[#CBD5E1] font-mono"
                        placeholder="Temporary password"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const rand = `Sw@yam${Math.random().toString(36).slice(-5)}99!`;
                          setApprovalForm((f) => ({ ...f, temporaryPassword: rand }));
                        }}
                        className="h-9 text-xs shrink-0"
                      >
                        Generate
                      </Button>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="checkbox"
                        id="forcePass"
                        checked={approvalForm.forcePasswordChange}
                        onChange={(e) =>
                          setApprovalForm((f) => ({
                            ...f,
                            forcePasswordChange: e.target.checked,
                          }))
                        }
                        className="w-3.5 h-3.5 rounded accent-[#4A7B5B]"
                      />
                      <Label
                        htmlFor="forcePass"
                        className="text-[11px] text-[#64748B] cursor-pointer"
                      >
                        Require password change on candidate's first login
                      </Label>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-emerald-200">
                    <Button
                      onClick={handleApproveStaff}
                      disabled={actionLoading}
                      className="flex-1 bg-[#4A7B5B] hover:bg-[#3D664B] text-white font-semibold text-xs h-10"
                    >
                      {actionLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-1" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 mr-1" />
                      )}
                      Approve & Activate Corporate Post
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setRejectModalOpen(true)}
                      disabled={actionLoading}
                      className="border-rose-300 text-rose-700 hover:bg-rose-50 text-xs h-10"
                    >
                      Reject Request
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* === KYC REJECTION MODAL === */}
      {kycRejectModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-rose-900">
              Reject KYC Document
            </h3>
            <p className="text-xs text-[#64748B]">
              Please specify the exact reason why the KYC document was rejected (e.g. illegible photocopy, name mismatch, expired).
            </p>
            <textarea
              value={kycRejectReason}
              onChange={(e) => setKycRejectReason(e.target.value)}
              rows={3}
              className="w-full p-2.5 text-xs border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-rose-500"
              placeholder="Enter rejection explanation..."
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setKycRejectModalOpen(false)}
                className="text-xs h-9"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => handleVerifyKyc("REJECT", selectedKycDocId)}
                disabled={actionLoading}
                className="bg-rose-600 hover:bg-rose-700 text-white text-xs h-9"
              >
                Confirm KYC Rejection
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* === STAFF ONBOARDING REJECTION MODAL === */}
      {rejectModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-[#4A7B5B]">
              Reject Staff Onboarding Request
            </h3>
            <p className="text-xs text-[#64748B]">
              Provide a clear reason for turning down this candidate's application.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              className="w-full p-2.5 text-xs border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-red-500"
              placeholder="Enter reason for rejection..."
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRejectModalOpen(false)}
                className="text-xs h-9"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleRejectStaff}
                disabled={actionLoading}
                className="bg-rose-600 hover:bg-rose-700 text-white text-xs h-9"
              >
                Confirm Rejection
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* === ADMIN PASSWORD RESET & SECURITY OPERATIONS MODAL === */}
      {securityModalOpen && securityTargetUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-amber-200 space-y-5">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-[#4A7B5B] text-sm">
                    Admin Staff Password & Security Operations
                  </h3>
                  <p className="text-[11px] text-[#64748B]">
                    User: {securityTargetUser.fullName} ({securityTargetUser.email})
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSecurityModalOpen(false)}
                className="h-7 w-7 p-0"
              >
                ✕
              </Button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-[#E2E8F0] gap-2 text-xs">
              <button
                onClick={() => setSecurityTab("reset_password")}
                className={`pb-2 px-2 font-semibold border-b-2 transition-colors ${
                  securityTab === "reset_password"
                    ? "border-amber-600 text-amber-900"
                    : "border-transparent text-gray-500 hover:text-gray-900"
                }`}
              >
                Admin Password Reset
              </button>
              <button
                onClick={() => setSecurityTab("revoke_sessions")}
                className={`pb-2 px-2 font-semibold border-b-2 transition-colors ${
                  securityTab === "revoke_sessions"
                    ? "border-amber-600 text-amber-900"
                    : "border-transparent text-gray-500 hover:text-gray-900"
                }`}
              >
                Revoke Sessions
              </button>
              <button
                onClick={() => setSecurityTab("lock")}
                className={`pb-2 px-2 font-semibold border-b-2 transition-colors ${
                  securityTab === "lock"
                    ? "border-amber-600 text-amber-900"
                    : "border-transparent text-gray-500 hover:text-gray-900"
                }`}
              >
                Lock / Unlock
              </button>
              <button
                onClick={() => setSecurityTab("resign")}
                className={`pb-2 px-2 font-semibold border-b-2 transition-colors ${
                  securityTab === "resign"
                    ? "border-amber-600 text-amber-900"
                    : "border-transparent text-gray-500 hover:text-gray-900"
                }`}
              >
                Process Resignation
              </button>
            </div>

            {/* === TAB 1: ADMIN PASSWORD RESET === */}
            {securityTab === "reset_password" && (
              <div className="space-y-4">
                {resetSuccessData ? (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3">
                    <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{resetSuccessData.message}</span>
                    </div>
                    <div className="p-3 bg-white border border-emerald-200 rounded-lg flex items-center justify-between">
                      <span className="font-mono text-sm font-bold text-[#4A7B5B]">
                        {resetSuccessData.temporaryPassword}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          navigator.clipboard.writeText(
                            resetSuccessData.temporaryPassword || "",
                          );
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        }}
                        className="h-8 text-xs"
                      >
                        {copied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600 mr-1" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 mr-1" />
                            Copy Temporary Password
                          </>
                        )}
                      </Button>
                    </div>
                    <p className="text-[11px] text-emerald-700">
                      Share this temporary password securely with the staff member. They will be required to establish their private permanent password upon login.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>
                        <strong>Instant Session Revocation:</strong> Resetting password will increment the user's session version, immediately revoking all active JWT sessions across all devices.
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs font-semibold mb-1 block">
                        Mandatory Administrative Reason *
                      </Label>
                      <select
                        value={passwordResetReason}
                        onChange={(e) => setPasswordResetReason(e.target.value)}
                        className="w-full h-9 px-2.5 text-xs border border-[#CBD5E1] rounded-lg bg-white"
                      >
                        <option value="Security Incident">Security Incident</option>
                        <option value="Resignation">Resignation</option>
                        <option value="Transfer">Transfer</option>
                        <option value="Replacement">Replacement</option>
                        <option value="Forgotten Password">Forgotten Password</option>
                        <option value="Account Recovery">Account Recovery</option>
                        <option value="Other">Other (Specify below)</option>
                      </select>
                    </div>

                    {passwordResetReason === "Other" && (
                      <div>
                        <Label className="text-xs font-semibold mb-1 block">
                          Custom Reason Notes *
                        </Label>
                        <Input
                          placeholder="Provide specific justification..."
                          value={passwordResetCustomReason}
                          onChange={(e) =>
                            setPasswordResetCustomReason(e.target.value)
                          }
                          className="h-9 text-xs border-[#CBD5E1]"
                        />
                      </div>
                    )}

                    <div>
                      <Label className="text-xs font-semibold mb-1 block">
                        Temporary Password
                      </Label>
                      <div className="flex items-center gap-2">
                        <Input
                          value={customTempPassword}
                          onChange={(e) => setCustomTempPassword(e.target.value)}
                          className="h-9 text-xs border-[#CBD5E1] font-mono"
                          placeholder="Leave blank to auto-generate"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const rand = `Sw@yam${Math.random().toString(36).slice(-5)}88!`;
                            setCustomTempPassword(rand);
                          }}
                          className="h-9 text-xs shrink-0"
                        >
                          Regenerate
                        </Button>
                      </div>
                    </div>

                    <Button
                      onClick={handleExecutePasswordReset}
                      disabled={actionLoading}
                      className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs h-10 mt-2"
                    >
                      {actionLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-1" />
                      ) : (
                        <KeyRound className="w-4 h-4 mr-1" />
                      )}
                      Reset Password & Revoke Active Sessions
                    </Button>
                  </>
                )}
              </div>
            )}

            {/* === TAB 2: REVOKE SESSIONS === */}
            {securityTab === "revoke_sessions" && (
              <div className="space-y-4 text-xs">
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800">
                  This action will invalidate all current JWT tokens and login cookies for{" "}
                  <strong>{securityTargetUser.fullName}</strong>. The user will be immediately logged out.
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Reason for Revocation</Label>
                  <Input
                    placeholder="e.g. Lost device, suspected compromise..."
                    value={generalSecurityReason}
                    onChange={(e) => setGeneralSecurityReason(e.target.value)}
                    className="h-9 text-xs border-[#CBD5E1]"
                  />
                </div>
                <Button
                  onClick={handleExecuteSessionRevocation}
                  disabled={actionLoading}
                  className="w-full bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs h-10"
                >
                  Confirm Instant Session Revocation
                </Button>
              </div>
            )}

            {/* === TAB 3: LOCK / UNLOCK ACCOUNT === */}
            {securityTab === "lock" && (
              <div className="space-y-4 text-xs">
                <p className="text-[#64748B]">
                  Currently status:{" "}
                  <strong className="text-[#4A7B5B]">
                    {securityTargetUser.status}
                  </strong>
                </p>
                {securityTargetUser.status !== "LOCKED" && (
                  <div>
                    <Label className="text-xs mb-1 block">Reason for Locking Account</Label>
                    <Input
                      placeholder="e.g. Audit investigation, policy violation..."
                      value={generalSecurityReason}
                      onChange={(e) => setGeneralSecurityReason(e.target.value)}
                      className="h-9 text-xs border-[#CBD5E1]"
                    />
                  </div>
                )}
                <Button
                  onClick={() =>
                    handleExecuteLockToggle(securityTargetUser.status === "LOCKED")
                  }
                  disabled={actionLoading}
                  className={
                    securityTargetUser.status === "LOCKED"
                      ? "w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-10"
                      : "w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs h-10"
                  }
                >
                  {securityTargetUser.status === "LOCKED"
                    ? "Unlock Staff Account"
                    : "Lock Staff Account (Block Login)"}
                </Button>
              </div>
            )}

            {/* === TAB 4: PROCESS RESIGNATION === */}
            {securityTab === "resign" && (
              <div className="space-y-4 text-xs">
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800">
                  <strong>Enterprise Post Continuity Rule:</strong> Processing resignation disables this person's account and revokes their mailbox access, but preserves the continuous corporate position and company email for their replacement.
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Handover Notes</Label>
                  <textarea
                    rows={3}
                    value={resignationNotes}
                    onChange={(e) => setResignationNotes(e.target.value)}
                    placeholder="Enter handover details, document transition notes..."
                    className="w-full p-2.5 text-xs border border-[#CBD5E1] rounded-lg focus:outline-none"
                  />
                </div>
                <Button
                  onClick={handleExecuteResignation}
                  disabled={actionLoading}
                  className="w-full bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs h-10"
                >
                  Process Resignation & Vacate Post
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
