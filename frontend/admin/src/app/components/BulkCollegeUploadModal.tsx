import React, { useState, useRef } from "react";
import {
  X,
  UploadCloud,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  FileText,
  ArrowRight,
  ShieldAlert,
  Layers,
  Database,
} from "lucide-react";
import { collegesApi, BulkValidationResponse, BulkImportResponse } from "../../api/colleges.api";

interface BulkCollegeUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type Step = "UPLOAD" | "PREVIEW" | "RESULT";

export default function BulkCollegeUploadModal({
  isOpen,
  onClose,
  onSuccess,
}: BulkCollegeUploadModalProps) {
  const [step, setStep] = useState<Step>("UPLOAD");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [validationResult, setValidationResult] = useState<BulkValidationResponse | null>(null);
  const [importResult, setImportResult] = useState<BulkImportResponse | null>(null);
  const [updateStrategy, setUpdateStrategy] = useState<"UPDATE_EXISTING" | "SKIP_EXISTING">("UPDATE_EXISTING");
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleReset = () => {
    setStep("UPLOAD");
    setSelectedFile(null);
    setValidationResult(null);
    setImportResult(null);
    setIsValidating(false);
    setIsImporting(false);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleDownloadTemplate = async (format: "csv" | "xlsx") => {
    try {
      setIsDownloadingTemplate(format);
      await collegesApi.downloadTemplate(format);
    } catch (err: any) {
      alert("Failed to download template: " + (err.message || "Unknown error"));
    } finally {
      setIsDownloadingTemplate(null);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleValidate = async () => {
    if (!selectedFile) return;
    try {
      setIsValidating(true);
      const res = await collegesApi.validateBulkUpload(selectedFile);
      if (res.data?.data) {
        setValidationResult(res.data.data);
        setStep("PREVIEW");
      }
    } catch (err: any) {
      alert(
        "Validation error: " +
          (err.response?.data?.message || err.message || "Could not validate file")
      );
    } finally {
      setIsValidating(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!validationResult || !validationResult.previewRows.length) return;
    try {
      setIsImporting(true);
      // Collect valid sanitized rows
      const validRowsToImport = validationResult.previewRows
        .filter((r) => r.action !== "INVALID" && r.sanitizedData)
        .map((r) => r.sanitizedData);

      if (!validRowsToImport.length) {
        alert("No valid rows available to import. Please review errors.");
        setIsImporting(false);
        return;
      }

      const res = await collegesApi.executeBulkImport(validRowsToImport, updateStrategy);
      if (res.data?.data) {
        setImportResult(res.data.data);
        setStep("RESULT");
        onSuccess();
      }
    } catch (err: any) {
      alert(
        "Import failed: " +
          (err.response?.data?.message || err.message || "Server error during import")
      );
    } finally {
      setIsImporting(false);
    }
  };

  const handleDownloadReport = () => {
    if (!importResult?.reportCsv) return;
    const blob = new Blob([importResult.reportCsv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `swayam_colleges_import_report_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border border-[#E2E8F0]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#F1F5F9] bg-[#F8FAFC]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#E8F3EC] flex items-center justify-center text-[#4A7B5B]">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#4A7B5B]">Bulk Upload Colleges</h2>
              <p className="text-xs text-gray-500">
                Import large-scale colleges directory via production Excel (.xlsx) or CSV (.csv)
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-600 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper Bar */}
        <div className="px-6 py-3 bg-white border-b border-gray-100 flex items-center justify-between text-xs font-semibold">
          <div className="flex items-center gap-2">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center ${
                step === "UPLOAD" ? "bg-[#4A7B5B] text-white" : "bg-[#E8F3EC] text-[#4A7B5B]"
              }`}
            >
              1
            </span>
            <span className={step === "UPLOAD" ? "text-[#4A7B5B] font-bold" : "text-gray-500"}>
              Upload & Templates
            </span>
          </div>
          <div className="w-12 h-0.5 bg-gray-200" />
          <div className="flex items-center gap-2">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center ${
                step === "PREVIEW" ? "bg-[#4A7B5B] text-white" : "bg-gray-100 text-gray-400"
              }`}
            >
              2
            </span>
            <span className={step === "PREVIEW" ? "text-[#4A7B5B] font-bold" : "text-gray-500"}>
              Validation & Preview
            </span>
          </div>
          <div className="w-12 h-0.5 bg-gray-200" />
          <div className="flex items-center gap-2">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center ${
                step === "RESULT" ? "bg-[#4A7B5B] text-white" : "bg-gray-100 text-gray-400"
              }`}
            >
              3
            </span>
            <span className={step === "RESULT" ? "text-[#4A7B5B] font-bold" : "text-gray-500"}>
              Import Summary & Report
            </span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#F8FAFC]">

          {/* STEP 1: UPLOAD & TEMPLATE DOWNLOAD */}
          {step === "UPLOAD" && (
            <div className="space-y-6">
              {/* Template Download Card */}
              <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-[#4A7B5B]" />
                    Official College Import Templates
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Download the pre-formatted template with all college fields (Overview, Hostel, Placement, Courses, SEO).
                  </p>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                  <button
                    onClick={() => handleDownloadTemplate("xlsx")}
                    disabled={isDownloadingTemplate !== null}
                    className="px-3.5 py-2 bg-[#E8F3EC] hover:bg-[#d5ebd9] text-[#4A7B5B] rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors border border-[#4A7B5B]/20"
                  >
                    <Download className="w-3.5 h-3.5" />
                    {isDownloadingTemplate === "xlsx" ? "Downloading..." : "Download Excel (.xlsx)"}
                  </button>
                  <button
                    onClick={() => handleDownloadTemplate("csv")}
                    disabled={isDownloadingTemplate !== null}
                    className="px-3.5 py-2 bg-white hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border border-gray-200"
                  >
                    <Download className="w-3.5 h-3.5 text-gray-500" />
                    {isDownloadingTemplate === "csv" ? "Downloading..." : "Download CSV (.csv)"}
                  </button>
                </div>
              </div>

              {/* Drag and Drop Upload Area */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="bg-white border-2 border-dashed border-[#4A7B5B]/40 hover:border-[#4A7B5B] rounded-3xl p-8 sm:p-10 text-center cursor-pointer transition-all hover:bg-[#E8F3EC]/10 group"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                />
                <div className="w-16 h-16 rounded-3xl bg-[#E8F3EC] group-hover:scale-105 transition-transform flex items-center justify-center text-[#4A7B5B] mx-auto mb-4">
                  <UploadCloud className="w-8 h-8" />
                </div>
                {selectedFile ? (
                  <div>
                    <span className="px-3 py-1 bg-[#E8F3EC] text-[#4A7B5B] rounded-full text-xs font-bold inline-block mb-2">
                      File Selected
                    </span>
                    <h4 className="text-base font-bold text-gray-800">{selectedFile.name}</h4>
                    <p className="text-xs text-gray-400 mt-1">
                      {(selectedFile.size / 1024).toFixed(1)} KB · Click to replace or change file
                    </p>
                  </div>
                ) : (
                  <div>
                    <h4 className="text-base font-bold text-gray-800 mb-1">
                      Choose an Excel or CSV file to import
                    </h4>
                    <p className="text-xs text-gray-500 max-w-sm mx-auto">
                      Drag and drop your filled college spreadsheet here, or click to browse files from your computer.
                    </p>
                    <span className="inline-block mt-4 px-4 py-2 bg-gray-100 group-hover:bg-[#4A7B5B] group-hover:text-white rounded-xl text-xs font-semibold text-gray-700 transition-colors">
                      Browse Files
                    </span>
                  </div>
                )}
              </div>

              {/* Large Scale Safety Notice */}
              <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-2xl p-4 flex items-start gap-3 text-xs text-[#1E40AF]">
                <Layers className="w-5 h-5 shrink-0 text-[#2563EB] mt-0.5" />
                <div>
                  <span className="font-bold block mb-0.5">High Performance Importer Architecture:</span>
                  Supports datasets of 100, 500, 1000+ colleges with chunked batching, schema validation, duplicate detection, and safe transactional persistence.
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: VALIDATION & PREVIEW */}
          {step === "PREVIEW" && validationResult && (
            <div className="space-y-6">
              {/* Summary Stats Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                <div className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-sm text-center">
                  <div className="text-xl font-black text-gray-800">{validationResult.totalRows}</div>
                  <div className="text-[11px] text-gray-400 font-semibold uppercase mt-0.5">Total Rows</div>
                </div>
                <div className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-sm text-center">
                  <div className="text-xl font-black text-[#4A7B5B]">{validationResult.validRows}</div>
                  <div className="text-[11px] text-[#4A7B5B] font-semibold uppercase mt-0.5">Valid Rows</div>
                </div>
                <div className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-sm text-center">
                  <div className="text-xl font-black text-emerald-600">{validationResult.rowsToCreate}</div>
                  <div className="text-[11px] text-emerald-700 font-semibold uppercase mt-0.5">To Create</div>
                </div>
                <div className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-sm text-center">
                  <div className="text-xl font-black text-blue-600">{validationResult.rowsToUpdate}</div>
                  <div className="text-[11px] text-blue-700 font-semibold uppercase mt-0.5">To Update</div>
                </div>
                <div className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-sm text-center">
                  <div className="text-xl font-black text-amber-500">{validationResult.duplicateRows}</div>
                  <div className="text-[11px] text-amber-700 font-semibold uppercase mt-0.5">Duplicates</div>
                </div>
                <div className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-sm text-center">
                  <div className="text-xl font-black text-rose-500">{validationResult.invalidRows}</div>
                  <div className="text-[11px] text-rose-700 font-semibold uppercase mt-0.5">Invalid</div>
                </div>
              </div>

              {/* Deduplication Strategy Selector */}
              <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-gray-800 block">Deduplication & Existing Records Strategy:</span>
                  <p className="text-xs text-gray-500">
                    Determines what happens when a matching college is detected by name/city or slug.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setUpdateStrategy("UPDATE_EXISTING")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      updateStrategy === "UPDATE_EXISTING"
                        ? "bg-[#4A7B5B] text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    Update Existing Records
                  </button>
                  <button
                    onClick={() => setUpdateStrategy("SKIP_EXISTING")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      updateStrategy === "SKIP_EXISTING"
                        ? "bg-[#4A7B5B] text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    Skip Duplicates
                  </button>
                </div>
              </div>

              {/* Errors Accordion if any */}
              {validationResult.errors.length > 0 && (
                <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-2xl p-4">
                  <h4 className="text-xs font-bold text-rose-800 flex items-center gap-1.5 mb-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    Validation Errors ({validationResult.errors.length})
                  </h4>
                  <div className="max-h-36 overflow-y-auto space-y-1 text-xs text-rose-700">
                    {validationResult.errors.slice(0, 50).map((err, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <span className="font-bold">Row {err.row}:</span>
                        <span>{err.field ? `[${err.field}] ` : ""}{err.message}</span>
                      </div>
                    ))}
                    {validationResult.errors.length > 50 && (
                      <div className="text-xs italic text-rose-500">
                        ...and {validationResult.errors.length - 50} more errors.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Data Preview Table */}
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-700">Import Preview (First 50 Rows)</span>
                  <span className="text-[11px] text-gray-400">
                    Showing {Math.min(validationResult.previewRows.length, 50)} of {validationResult.totalRows}
                  </span>
                </div>
                <div className="overflow-x-auto max-h-72">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F8FAFC] text-gray-500 font-semibold sticky top-0 border-b border-gray-200">
                      <tr>
                        <th className="py-2.5 px-3">Row</th>
                        <th className="py-2.5 px-3">Action</th>
                        <th className="py-2.5 px-3">College Name</th>
                        <th className="py-2.5 px-3">Location</th>
                        <th className="py-2.5 px-3">Type</th>
                        <th className="py-2.5 px-3">Hostel</th>
                        <th className="py-2.5 px-3">Gallery</th>
                        <th className="py-2.5 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {validationResult.previewRows.slice(0, 50).map((row) => (
                        <tr key={row.rowIndex} className="hover:bg-gray-50">
                          <td className="py-2.5 px-3 font-semibold text-gray-400">{row.rowIndex}</td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                row.action === "CREATE"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : row.action === "UPDATE"
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-rose-100 text-rose-800"
                              }`}
                            >
                              {row.action}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-gray-800 max-w-[200px] truncate">
                            {row.name}
                          </td>
                          <td className="py-2.5 px-3 text-gray-600">
                            {row.city}, {row.state}
                          </td>
                          <td className="py-2.5 px-3 text-gray-500">{row.ownership}</td>
                          <td className="py-2.5 px-3">
                            {row.hasHostel ? (
                              <span className="text-[#4A7B5B] font-semibold">Yes</span>
                            ) : (
                              <span className="text-gray-400">No</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-gray-500">{row.galleryCount} imgs</td>
                          <td className="py-2.5 px-3">
                            {row.errors.length > 0 ? (
                              <span className="text-rose-600 font-semibold truncate block max-w-[150px]">
                                {row.errors[0]}
                              </span>
                            ) : (
                              <span className="text-gray-600">{row.status}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: RESULT & DOWNLOADABLE REPORT */}
          {step === "RESULT" && importResult && (
            <div className="space-y-6">
              <div className="text-center py-4">
                <div className="w-14 h-14 rounded-full bg-[#E8F3EC] text-[#4A7B5B] flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-gray-800">Bulk Import Execution Finished</h3>
                <p className="text-xs text-gray-500 max-w-md mx-auto mt-1">
                  The colleges have been processed and safely persisted to the database. Review summary below.
                </p>
              </div>

              {/* Result Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm text-center">
                  <div className="text-2xl font-black text-emerald-600">
                    {importResult.successfullyCreated}
                  </div>
                  <div className="text-xs text-emerald-800 font-bold mt-1">Created</div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm text-center">
                  <div className="text-2xl font-black text-blue-600">
                    {importResult.successfullyUpdated}
                  </div>
                  <div className="text-xs text-blue-800 font-bold mt-1">Updated</div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm text-center">
                  <div className="text-2xl font-black text-amber-500">
                    {importResult.skipped}
                  </div>
                  <div className="text-xs text-amber-800 font-bold mt-1">Skipped</div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm text-center">
                  <div className="text-2xl font-black text-rose-500">
                    {importResult.failed}
                  </div>
                  <div className="text-xs text-rose-800 font-bold mt-1">Failed</div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm text-center col-span-2 sm:col-span-1">
                  <div className="text-2xl font-black text-gray-800">
                    {importResult.totalProcessed}
                  </div>
                  <div className="text-xs text-gray-600 font-bold mt-1">Total Processed</div>
                </div>
              </div>

              {/* Download CSV Report Banner */}
              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#4A7B5B]" /> Download Execution Report
                  </h4>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Download row-by-row status and error notes in CSV format for audit and corrections.
                  </p>
                </div>
                <button
                  onClick={handleDownloadReport}
                  className="px-4 py-2 bg-[#4A7B5B] hover:bg-[#3d6b4d] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <Download className="w-4 h-4" /> Download Report (.csv)
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 px-6 border-t border-[#F1F5F9] bg-white flex items-center justify-between">
          <div>
            {step === "PREVIEW" && (
              <button
                onClick={() => setStep("UPLOAD")}
                disabled={isImporting}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
              >
                ← Back to Upload
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {step === "UPLOAD" && (
              <>
                <button
                  onClick={handleClose}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-500 hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleValidate}
                  disabled={!selectedFile || isValidating}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white flex items-center gap-2 transition-all disabled:opacity-50"
                  style={{ background: "#4A7B5B" }}
                >
                  {isValidating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Validating File...
                    </>
                  ) : (
                    <>
                      Validate File <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </>
            )}

            {step === "PREVIEW" && (
              <>
                <button
                  onClick={handleClose}
                  disabled={isImporting}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-500 hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmImport}
                  disabled={isImporting || validationResult?.validRows === 0}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold text-white flex items-center gap-2 transition-all disabled:opacity-50"
                  style={{ background: "#4A7B5B" }}
                >
                  {isImporting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Importing Colleges...
                    </>
                  ) : (
                    <>
                      Confirm & Start Import ({validationResult?.validRows} Colleges)
                    </>
                  )}
                </button>
              </>
            )}

            {step === "RESULT" && (
              <button
                onClick={handleClose}
                className="px-6 py-2.5 rounded-xl text-xs font-bold text-white transition-all"
                style={{ background: "#4A7B5B" }}
              >
                Done
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
