import React, { useState } from "react";
import { useParams, Link } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileText,
  CheckCircle,
  XCircle,
  Calendar,
  Briefcase,
  MapPin,
  Clock,
  Printer,
  ChevronLeft,
  AlertCircle,
  ShieldCheck,
  Building2,
  DollarSign,
  UserCheck,
} from "lucide-react";
import { careersApi, RespondOfferPayload } from "../../api/careers.api";

export default function CandidateOfferViewPage() {
  const { identifier } = useParams<{ identifier: string }>();
  const queryClient = useQueryClient();

  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const {
    data: offer,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["candidate_offer", identifier],
    queryFn: async () => {
      if (!identifier) throw new Error("Missing offer reference");
      const res = await careersApi.getOffer(identifier);
      return res.data;
    },
    enabled: !!identifier,
  });

  const respondMutation = useMutation({
    mutationFn: async (payload: RespondOfferPayload) => {
      if (!identifier) throw new Error("Missing offer reference");
      const res = await careersApi.respondOffer(identifier, payload);
      return res.data;
    },
    onSuccess: () => {
      setShowAcceptModal(false);
      setShowDeclineModal(false);
      setDeclineReason("");
      setActionError(null);
      queryClient.invalidateQueries({ queryKey: ["candidate_offer", identifier] });
      refetch();
    },
    onError: (err: any) => {
      setActionError(
        err?.response?.data?.message || err?.message || "Failed to submit response. Please try again."
      );
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-[#4A7B5B] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-600 font-medium text-sm">Loading employment offer details...</p>
        </div>
      </div>
    );
  }

  if (isError || !offer) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center space-y-4">
          <div className="w-14 h-14 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Offer Letter Not Found</h2>
          <p className="text-sm text-slate-600">
            {error instanceof Error ? error.message : "The requested employment offer could not be retrieved or has expired."}
          </p>
          <div className="pt-2">
            <Link
              to="/careers"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#4A7B5B] hover:bg-[#3D664B] text-white rounded-xl text-sm font-semibold transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> Back to Careers
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const app = offer.application;
  const candidateName = app ? `${app.firstName} ${app.lastName || ""}`.trim() : "Valued Candidate";
  const vacancyTitle = app?.vacancy?.title || offer.designation || "Employment Position";

  const isOfferActive = offer.status === "OFFER_SENT" || offer.status === "SENT";
  const isAccepted = offer.status === "OFFER_ACCEPTED" || offer.status === "ACCEPTED";
  const isDeclined = offer.status === "OFFER_DECLINED" || offer.status === "DECLINED";
  const isExpired =
    offer.status === "EXPIRED" || (offer.validUntil && new Date(offer.validUntil) < new Date() && !isAccepted);

  const handlePrint = () => {
    window.print();
  };

  const handleAccept = () => {
    if (!termsAgreed) {
      setActionError("Please confirm that you have read and agreed to the offer terms.");
      return;
    }
    setActionError(null);
    respondMutation.mutate({ action: "ACCEPT", channel: "WEB_PORTAL" });
  };

  const handleDecline = () => {
    if (!declineReason.trim()) {
      setActionError("Please provide a reason for declining the employment offer.");
      return;
    }
    setActionError(null);
    respondMutation.mutate({ action: "DECLINE", reason: declineReason.trim(), channel: "WEB_PORTAL" });
  };

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      {/* Top Bar (Hidden on print) */}
      <div className="max-w-4xl mx-auto mb-6 flex flex-wrap items-center justify-between gap-4 print:hidden">
        <Link
          to="/careers"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-[#4A7B5B] transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Careers
        </Link>
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-semibold shadow-sm transition-all"
          >
            <Printer className="w-4 h-4" /> Print / Save PDF
          </button>
        </div>
      </div>

      {/* Main Letter Card */}
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden print:shadow-none print:border-none">
        {/* Letterhead Header */}
        <div className="bg-gradient-to-r from-[#4A7B5B] to-[#365A42] text-white p-8 sm:p-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center font-black text-xl text-white">
                  SA
                </span>
                <div>
                  <h1 className="text-2xl font-black tracking-tight">SWAYAM ADMISSION</h1>
                  <p className="text-xs text-white/80 uppercase tracking-widest font-semibold">
                    Career & Recruitment Division
                  </p>
                </div>
              </div>
              <p className="text-xs text-white/70 mt-1">
                Official Employment Offer Letter &bull; Swayam Admission Educational Portal
              </p>
            </div>
            <div className="sm:text-right bg-white/10 backdrop-blur-sm px-4 py-3 rounded-xl border border-white/20">
              <span className="text-xs uppercase tracking-wider text-white/80 font-bold block">
                Offer Reference ID
              </span>
              <span className="font-mono font-bold text-lg text-white">
                {offer.offerCode || offer.id}
              </span>
              <div className="text-xs text-white/70 mt-1">
                Issued: {new Date(offer.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
              </div>
            </div>
          </div>
        </div>

        {/* Status Alert Banner */}
        {isAccepted && (
          <div className="bg-emerald-50 border-b border-emerald-200 p-4 sm:px-8 flex items-center gap-3 text-emerald-800">
            <CheckCircle className="w-6 h-6 text-emerald-600 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-bold">Employment Offer Accepted</p>
              <p className="text-emerald-700">
                You accepted this offer on {offer.acceptedAt ? new Date(offer.acceptedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "record"}. Our HR team has initiated your pre-boarding clearance. Welcome aboard!
              </p>
            </div>
          </div>
        )}

        {isDeclined && (
          <div className="bg-rose-50 border-b border-rose-200 p-4 sm:px-8 flex items-center gap-3 text-rose-800">
            <XCircle className="w-6 h-6 text-rose-600 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-bold">Employment Offer Declined</p>
              <p className="text-rose-700">
                This offer was marked as declined on {offer.declinedAt ? new Date(offer.declinedAt).toLocaleDateString("en-IN") : "record"}.
                {offer.declinedReason && <span className="block mt-1 font-medium italic">&ldquo;{offer.declinedReason}&rdquo;</span>}
              </p>
            </div>
          </div>
        )}

        {isExpired && !isAccepted && !isDeclined && (
          <div className="bg-amber-50 border-b border-amber-200 p-4 sm:px-8 flex items-center gap-3 text-amber-800">
            <Clock className="w-6 h-6 text-amber-600 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-bold">Offer Validity Period Expired</p>
              <p className="text-amber-700">
                The response window for this offer closed on {offer.validUntil ? new Date(offer.validUntil).toLocaleDateString("en-IN") : "the validity deadline"}. Please contact recruitment at Swayam Admission if you require an extension.
              </p>
            </div>
          </div>
        )}

        {/* Letter Body */}
        <div className="p-8 sm:p-10 space-y-8">
          {/* Greeting */}
          <div>
            <p className="text-sm text-slate-500 font-medium">Dear</p>
            <h2 className="text-2xl font-bold text-slate-900 mt-1">{candidateName},</h2>
            <p className="text-slate-600 mt-3 leading-relaxed">
              Following your successful interview evaluations and the review of your professional credentials, we are pleased to offer you the position of <strong className="text-slate-900 font-semibold">{offer.designation || vacancyTitle}</strong> with <strong className="text-[#4A7B5B] font-semibold">Swayam Admission</strong>.
            </p>
          </div>

          {/* Key Appointment Parameters Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                <Briefcase className="w-3.5 h-3.5 text-[#4A7B5B]" /> Position / Role
              </div>
              <div className="font-bold text-slate-900 text-sm">{offer.designation || vacancyTitle}</div>
              <div className="text-xs text-slate-500 mt-0.5">{offer.department || "Admissions"}</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                <DollarSign className="w-3.5 h-3.5 text-[#4A7B5B]" /> Compensation (CTC)
              </div>
              <div className="font-bold text-[#4A7B5B] text-base">
                {offer.salary ? `₹${Number(offer.salary).toLocaleString("en-IN")}` : "As Discussed"}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                {offer.salaryFrequency === "MONTHLY" ? "Per Month" : "Per Annum (Gross CTC)"}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                <Calendar className="w-3.5 h-3.5 text-[#4A7B5B]" /> Date of Joining
              </div>
              <div className="font-bold text-slate-900 text-sm">
                {offer.joiningDate ? new Date(offer.joiningDate).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" }) : "To be mutually agreed"}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                Validity: {offer.validUntil ? new Date(offer.validUntil).toLocaleDateString("en-IN") : "7 calendar days"}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                <MapPin className="w-3.5 h-3.5 text-[#4A7B5B]" /> Work Location & Mode
              </div>
              <div className="font-bold text-slate-900 text-sm">{offer.workLocation || "Head Office"}</div>
              <div className="text-xs text-slate-500 mt-0.5">Mode: {offer.workMode || "ONSITE"}</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                <Building2 className="w-3.5 h-3.5 text-[#4A7B5B]" /> Employment Nature
              </div>
              <div className="font-bold text-slate-900 text-sm">{offer.employmentType?.replace(/_/g, " ") || "FULL TIME"}</div>
              <div className="text-xs text-slate-500 mt-0.5">Probationary terms apply</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                <UserCheck className="w-3.5 h-3.5 text-[#4A7B5B]" /> Reporting Authority
              </div>
              <div className="font-bold text-slate-900 text-sm">{offer.reportingManager || "Department Head"}</div>
              <div className="text-xs text-slate-500 mt-0.5">Direct Reporting</div>
            </div>
          </div>

          {/* Terms and Conditions */}
          <div className="space-y-4 pt-2">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#4A7B5B]" /> Terms and Conditions of Employment
            </h3>

            {offer.terms ? (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-700 whitespace-pre-line leading-relaxed">
                {offer.terms}
              </div>
            ) : (
              <ul className="space-y-2 text-sm text-slate-600 list-disc list-inside">
                <li>
                  This appointment is contingent upon satisfactory completion of background verification, credential authentication, and document validation.
                </li>
                <li>
                  You will be on probation for a period of six (6) months from the date of joining, during which performance evaluations will be conducted.
                </li>
                <li>
                  Your compensation is strictly confidential and subject to statutory deductions (PF, ESI, Professional Tax, and Income Tax) as mandated by law.
                </li>
                <li>
                  Please formally signify your acceptance by clicking the &ldquo;Accept Offer&rdquo; button below on or before{" "}
                  <strong>
                    {offer.validUntil
                      ? new Date(offer.validUntil).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                      : "the designated expiry date"}
                  </strong>
                  .
                </li>
              </ul>
            )}

            {offer.notes && (
              <div className="mt-4 p-4 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900">
                <strong className="block font-semibold mb-1">HR Special Notes:</strong>
                {offer.notes}
              </div>
            )}
          </div>

          {/* Signatures on Print */}
          <div className="pt-10 border-t border-slate-200 grid grid-cols-2 gap-8">
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Authorized Signatory</p>
              <div className="mt-8 pt-2 border-t border-slate-300">
                <p className="font-bold text-slate-900 text-sm">Head of Human Resources</p>
                <p className="text-xs text-slate-500">Swayam Admission</p>
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Candidate Acceptance</p>
              <div className="mt-8 pt-2 border-t border-slate-300">
                <p className="font-bold text-slate-900 text-sm">{candidateName}</p>
                <p className="text-xs text-slate-500">
                  {isAccepted ? `Accepted electronically on ${new Date(offer.acceptedAt!).toLocaleDateString("en-IN")}` : "Signature / Electronic Consent"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Bar (Only visible if active and not printing) */}
        {isOfferActive && !isExpired && (
          <div className="bg-slate-50 border-t border-slate-200 p-6 sm:px-10 flex flex-col sm:flex-row items-center justify-between gap-4 print:hidden">
            <div className="text-xs text-slate-500">
              <span className="font-semibold text-slate-700">Notice:</span> By clicking Accept, you electronically execute your acceptance of this offer.
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => {
                  setActionError(null);
                  setShowDeclineModal(true);
                }}
                className="flex-1 sm:flex-initial px-5 py-2.5 bg-white border border-rose-300 hover:bg-rose-50 text-rose-700 rounded-xl text-sm font-bold shadow-sm transition-all"
              >
                Decline Offer
              </button>
              <button
                type="button"
                onClick={() => {
                  setActionError(null);
                  setShowAcceptModal(true);
                }}
                className="flex-1 sm:flex-initial px-6 py-2.5 bg-[#4A7B5B] hover:bg-[#3D664B] text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all"
              >
                Accept Offer
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Accept Offer Modal */}
      {showAcceptModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-6 sm:p-8 space-y-5 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mx-auto">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-bold text-slate-900">Accept Employment Offer</h3>
              <p className="text-xs text-slate-500 mt-1">
                You are accepting the offer for <strong>{offer.designation || vacancyTitle}</strong> with Swayam Admission.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs text-slate-600">
              <div className="flex justify-between">
                <span className="font-medium text-slate-500">Position:</span>
                <span className="font-semibold text-slate-900">{offer.designation || vacancyTitle}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-slate-500">Compensation:</span>
                <span className="font-semibold text-[#4A7B5B]">
                  ₹{Number(offer.salary || 0).toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-slate-500">Joining Date:</span>
                <span className="font-semibold text-slate-900">
                  {offer.joiningDate ? new Date(offer.joiningDate).toLocaleDateString("en-IN") : "TBD"}
                </span>
              </div>
            </div>

            <label className="flex items-start gap-3 cursor-pointer text-xs text-slate-700">
              <input
                type="checkbox"
                checked={termsAgreed}
                onChange={(e) => setTermsAgreed(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-[#4A7B5B] focus:ring-[#4A7B5B]"
              />
              <span>
                I have read, understood, and accept all terms, compensation parameters, and conditions outlined in this offer letter.
              </span>
            </label>

            {actionError && (
              <div className="p-3 rounded-lg bg-red-50 text-red-700 text-xs font-medium">
                {actionError}
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowAcceptModal(false)}
                disabled={respondMutation.isPending}
                className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAccept}
                disabled={respondMutation.isPending}
                className="flex-1 py-2.5 px-4 bg-[#4A7B5B] hover:bg-[#3D664B] text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2"
              >
                {respondMutation.isPending ? "Confirming..." : "Confirm Acceptance"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Decline Offer Modal */}
      {showDeclineModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-6 sm:p-8 space-y-5 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center mx-auto">
              <XCircle className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-bold text-slate-900">Decline Employment Offer</h3>
              <p className="text-xs text-slate-500 mt-1">
                Please provide feedback on why you are unable to accept this position at this time.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Reason for Declining <span className="text-red-500">*</span>
              </label>
              <textarea
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                rows={4}
                placeholder="e.g. Accepted another offer, compensation mismatch, location constraints..."
                className="w-full text-xs rounded-xl border-slate-300 focus:border-[#4A7B5B] focus:ring focus:ring-[#4A7B5B]/20 p-3"
              />
            </div>

            {actionError && (
              <div className="p-3 rounded-lg bg-red-50 text-red-700 text-xs font-medium">
                {actionError}
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeclineModal(false)}
                disabled={respondMutation.isPending}
                className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDecline}
                disabled={respondMutation.isPending}
                className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2"
              >
                {respondMutation.isPending ? "Submitting..." : "Confirm Decline"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
