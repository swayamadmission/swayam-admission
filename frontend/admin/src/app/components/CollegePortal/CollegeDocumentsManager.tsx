import React, { useState, useEffect } from "react";
import {
  FolderOpen,
  UploadCloud,
  FileCheck,
  Calendar,
  Trash2,
  ExternalLink,
  X,
  FileText,
} from "lucide-react";
import { collegesApi, CollegeDocument } from "../../../api/colleges.api";

interface CollegeDocumentsManagerProps {
  collegeId: string;
}

export const CollegeDocumentsManager: React.FC<CollegeDocumentsManagerProps> = ({
  collegeId,
}) => {
  const [documents, setDocuments] = useState<CollegeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    type: "AICTE_APPROVAL",
    title: "AICTE Mandatory Approval Letter 2026-27",
    fileName: "aicte_approval_2026.pdf",
    fileUrl: "https://example.com/docs/aicte_approval_2026.pdf",
    mimeType: "application/pdf",
    validFrom: "",
    validUntil: "",
  });

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const res = await collegesApi.getDocuments(collegeId);
      if (res.data.success) {
        setDocuments(res.data.data);
      }
    } catch (err) {
      console.error("Failed to load documents", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (collegeId) {
      loadDocuments();
    }
  }, [collegeId]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await collegesApi.uploadDocument(collegeId, {
        ...formData,
        validFrom: formData.validFrom ? new Date(formData.validFrom).toISOString() : undefined,
        validUntil: formData.validUntil ? new Date(formData.validUntil).toISOString() : undefined,
      });
      setModalOpen(false);
      loadDocuments();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to upload document");
    }
  };

  const handleDelete = async (docId: string) => {
    if (!confirm("Are you sure you want to remove this compliance document?")) return;
    try {
      await collegesApi.deleteDocument(collegeId, docId);
      loadDocuments();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to delete document");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#0F172A]">
            Institutional Compliance & Accreditation Vault
          </h2>
          <p className="text-xs text-[#64748B]">
            Maintain statutory statutory regulatory approvals, NAAC accreditation, and university affiliations.
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="px-4 py-2 text-sm font-semibold bg-[#4A7B5B] text-white hover:bg-[#3D674C] rounded-xl shadow-sm transition flex items-center gap-1.5"
        >
          <UploadCloud className="w-4 h-4" /> Upload Compliance Document
        </button>
      </div>

      {/* Document Grid */}
      {loading ? (
        <div className="p-8 text-center text-[#64748B]">Loading document vault...</div>
      ) : documents.length === 0 ? (
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-12 text-center text-[#64748B] space-y-3">
          <FolderOpen className="w-10 h-10 mx-auto text-[#94A3B8]" />
          <p className="font-medium text-[#0F172A]">No compliance documents uploaded</p>
          <p className="text-xs">
            Upload AICTE / UGC letters and NAAC accreditation to maintain verified partner status.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="bg-white border border-[#E2E8F0] p-5 rounded-2xl shadow-sm flex flex-col justify-between space-y-4 hover:border-[#4A7B5B]/30 transition"
            >
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-xl bg-[#E8F3EC] flex items-center justify-center text-[#4A7B5B]">
                  <FileText className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                  {doc.type}
                </span>
              </div>

              <div>
                <h4 className="font-bold text-[#0F172A] text-sm line-clamp-1">
                  {doc.title}
                </h4>
                <p className="text-xs text-[#64748B] mt-1 truncate">{doc.fileName}</p>
                {doc.validUntil && (
                  <div className="flex items-center gap-1 text-[11px] text-[#64748B] mt-2">
                    <Calendar className="w-3 h-3 text-[#94A3B8]" />
                    <span>Valid until: {new Date(doc.validUntil).toLocaleDateString()}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-[#E2E8F0]">
                <a
                  href={doc.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold text-[#4A7B5B] hover:underline flex items-center gap-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> View File
                </a>
                <button
                  onClick={() => handleDelete(doc.id)}
                  className="text-xs text-rose-600 hover:text-rose-800 p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#E2E8F0] my-8 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <h3 className="font-bold text-[#0F172A] text-lg">
                Upload Compliance Document
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-[#64748B] hover:text-[#0F172A]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpload} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                  Document Category *
                </label>
                <select
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({ ...formData, type: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/30"
                >
                  <option value="AICTE_APPROVAL">AICTE Mandatory Approval Letter</option>
                  <option value="UGC_RECOGNITION">UGC 2(f) & 12(B) Recognition</option>
                  <option value="NAAC_CERTIFICATE">NAAC Accreditation Certificate</option>
                  <option value="UNIVERSITY_AFFILIATION">University Affiliation Order</option>
                  <option value="FEE_REGULATORY_ORDER">Fee Regulatory Committee Order</option>
                  <option value="MOU_PARTNERSHIP">Swayam Admission Partner MoU</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                  Document Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/30"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                  File Document URL *
                </label>
                <input
                  type="url"
                  required
                  value={formData.fileUrl}
                  onChange={(e) =>
                    setFormData({ ...formData, fileUrl: e.target.value })
                  }
                  placeholder="https://bucket.storage.swayamadmission.com/..."
                  className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/30"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                    Valid From
                  </label>
                  <input
                    type="date"
                    value={formData.validFrom}
                    onChange={(e) =>
                      setFormData({ ...formData, validFrom: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                    Valid Until
                  </label>
                  <input
                    type="date"
                    value={formData.validUntil}
                    onChange={(e) =>
                      setFormData({ ...formData, validUntil: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-xl"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-[#64748B] hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold bg-[#4A7B5B] text-white hover:bg-[#3D674C] rounded-xl shadow-sm"
                >
                  Store in Vault
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
