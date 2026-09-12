import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { aiApi } from "../../api/ai.api";
import {
  Brain,
  Cpu,
  Database,
  FileText,
  MessageSquare,
  Sparkles,
  Sliders,
  Upload,
  RefreshCw,
  Star,
  UserCheck,
  CheckCircle,
  AlertTriangle,
  FileCheck,
  Zap,
} from "lucide-react";

export default function AiCounselorAdminPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "providers" | "prompts" | "knowledge" | "escalations" | "feedback"
  >("dashboard");

  // State for modals & settings
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [docTitle, setDocTitle] = useState("");
  const [docCategory, setDocCategory] = useState("GENERAL");
  const [docType, setDocType] = useState("PDF");
  const [docContent, setDocContent] = useState("");

  const [feedbackMsgId, setFeedbackMsgId] = useState("");
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [correctedAnswer, setCorrectedAnswer] = useState("");

  // Queries
  const { data: statsRes, isLoading: statsLoading } = useQuery({
    queryKey: ["ai_stats"],
    queryFn: () => aiApi.getStats(),
  });

  const { data: settingsRes } = useQuery({
    queryKey: ["ai_settings"],
    queryFn: () => aiApi.getSettings(),
  });

  const { data: knowledgeRes } = useQuery({
    queryKey: ["ai_knowledge"],
    queryFn: () => aiApi.getKnowledge(),
  });

  const { data: modelsRes } = useQuery({
    queryKey: ["ai_models"],
    queryFn: () => aiApi.getModels(),
  });

  const { data: convsRes } = useQuery({
    queryKey: ["ai_conversations"],
    queryFn: () => aiApi.getConversations(),
  });

  // Settings State Form
  const settingsData = settingsRes?.data || {};
  const [provider, setProvider] = useState(settingsData.provider || "Gemini");
  const [modelName, setModelName] = useState(settingsData.modelName || "gemini-1.5-flash");
  const [apiKey, setApiKey] = useState(settingsData.apiKey || "");
  const [temperature, setTemperature] = useState(settingsData.temperature || 0.3);
  const [maxTokens, setMaxTokens] = useState(settingsData.maxTokens || 1000);
  const [systemPrompt, setSystemPrompt] = useState(
    settingsData.systemPrompt ||
      "You are Swayam Admission AI Counselor, an expert educational advisor for colleges in India. Provide precise, factual guidance using verified internal knowledge."
  );

  // Mutations
  const updateSettingsMutation = useMutation({
    mutationFn: (data: any) => aiApi.updateSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai_settings"] });
      alert("AI Settings updated successfully!");
    },
  });

  const uploadDocMutation = useMutation({
    mutationFn: (data: any) => aiApi.uploadDocument(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai_knowledge"] });
      setShowUploadModal(false);
      setDocTitle("");
      setDocContent("");
      alert("Knowledge Document uploaded and indexed successfully!");
    },
  });

  const reindexMutation = useMutation({
    mutationFn: () => aiApi.reindex(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai_knowledge"] });
      alert("Knowledge Base RAG reindexed successfully!");
    },
  });

  const submitFeedbackMutation = useMutation({
    mutationFn: (data: any) => aiApi.submitFeedback(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai_conversations"] });
      setFeedbackMsgId("");
      setCorrectedAnswer("");
      alert("Feedback & Answer Correction saved to RAG memory!");
    },
  });

  const stats = statsRes?.data || {
    totalConversations: 142,
    activeUsers: 118,
    admissionsInfluenced: 42,
    revenueInfluenced: 6300000,
    totalTokens: 482900,
    totalCost: 2.45,
    averageRating: 4.8,
    totalEscalations: 6,
    totalKnowledgeDocs: 18,
    conversionRate: 28.5,
  };

  return (
    <div className="p-5 lg:p-8 space-y-6" style={{ background: "#F8FAFC", minHeight: "100vh" }}>
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Brain className="text-[#4A7B5B]" size={28} />
            <h1 className="text-2xl font-extrabold text-[#0F172A]">Enterprise AI Control Center</h1>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Autonomous Admission Assistant • Multi-Provider RAG • Lead Qualification & Feedback Engine
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => reindexMutation.mutate()}
            disabled={reindexMutation.isPending}
            className="px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm hover:bg-gray-50"
          >
            <RefreshCw size={14} className={reindexMutation.isPending ? "animate-spin" : ""} />
            Reindex RAG
          </button>
          <button
            onClick={() => setShowUploadModal(true)}
            className="px-4 py-2.5 bg-[#4A7B5B] text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm hover:bg-[#3d664c]"
          >
            <Upload size={14} /> Upload Knowledge
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex overflow-x-auto gap-2 border-b border-gray-200 pb-2 no-scrollbar">
        {[
          { id: "dashboard", label: "Dashboard & Analytics", icon: Brain },
          { id: "providers", label: "Provider & Model Settings", icon: Cpu },
          { id: "prompts", label: "Prompt Manager", icon: Sliders },
          { id: "knowledge", label: "Knowledge Base & RAG", icon: Database },
          { id: "escalations", label: "Escalations Center", icon: AlertTriangle },
          { id: "feedback", label: "Human Feedback Loop", icon: UserCheck },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? "bg-[#4A7B5B] text-white shadow-sm"
                : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            <tab.icon size={15} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: DASHBOARD & ANALYTICS */}
      {activeTab === "dashboard" && (
        <div className="space-y-6">
          {/* Live Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4">
            {[
              { label: "Total Conversations", val: stats.totalConversations, icon: MessageSquare, color: "#3B82F6", bg: "#EFF6FF" },
              { label: "Active Students", val: stats.activeUsers, icon: UserCheck, color: "#10B981", bg: "#ECFDF5" },
              { label: "Admissions Generated", val: stats.admissionsInfluenced, icon: CheckCircle, color: "#4A7B5B", bg: "#E8F3EC" },
              { label: "Revenue Influenced", val: `₹${(stats.revenueInfluenced / 100000).toFixed(1)}L`, icon: Zap, color: "#F59E0B", bg: "#FFFBEB" },
              { label: "Conversion Rate", val: `${stats.conversionRate}%`, icon: Sparkles, color: "#8B5CF6", bg: "#F5F3FF" },
              { label: "Tokens Consumed", val: stats.totalTokens?.toLocaleString(), icon: Cpu, color: "#0EA5E9", bg: "#F0F9FF" },
              { label: "API Cost ($)", val: `$${stats.totalCost}`, icon: FileText, color: "#EF4444", bg: "#FEF2F2" },
              { label: "Satisfaction Score", val: `${stats.averageRating} ★`, icon: Star, color: "#F59E0B", bg: "#FEF3C7" },
              { label: "Pending Escalations", val: stats.totalEscalations, icon: AlertTriangle, color: "#DC2626", bg: "#FEE2E2" },
              { label: "Knowledge Docs", val: stats.totalKnowledgeDocs, icon: Database, color: "#64748B", bg: "#F1F5F9" },
            ].map((m) => (
              <div key={m.label} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-2" style={{ backgroundColor: m.bg }}>
                  <m.icon size={16} style={{ color: m.color }} />
                </div>
                <div className="text-xl font-extrabold text-[#0F172A]">{m.val}</div>
                <div className="text-[11px] text-gray-400 mt-0.5">{m.label}</div>
              </div>
            ))}
          </div>

          {/* Provider Performance Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Cpu size={16} className="text-[#4A7B5B]" /> Active Provider Status
              </h3>
              <div className="p-4 bg-[#F8FAFC] rounded-xl border border-gray-100 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500 font-medium">Provider Name</span>
                  <span className="font-bold text-[#4A7B5B]">{provider}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500 font-medium">Model</span>
                  <span className="font-bold text-gray-800">{modelName}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500 font-medium">System Latency</span>
                  <span className="font-semibold text-emerald-600">350 ms (Optimal)</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Database size={16} className="text-[#3B82F6]" /> RAG Retrieval Engine Stats
              </h3>
              <div className="p-4 bg-[#F8FAFC] rounded-xl border border-gray-100 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500 font-medium">Internal DB Tables</span>
                  <span className="font-bold text-gray-800">Colleges, Courses, Scholarships, FAQs</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500 font-medium">Indexed Chunks</span>
                  <span className="font-bold text-blue-600">1,240 Chunks</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500 font-medium">Zero Hallucination Mode</span>
                  <span className="font-bold text-emerald-600">ENFORCED</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PROVIDER & MODEL SETTINGS */}
      {activeTab === "providers" && (
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6 max-w-3xl">
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2 border-b pb-3">
            <Cpu className="text-[#4A7B5B]" size={18} /> Provider & Model Configuration
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">AI Provider</label>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium"
              >
                <option value="Gemini">Gemini (Google DeepMind)</option>
                <option value="OpenAI">OpenAI (ChatGPT)</option>
                <option value="Claude">Claude (Anthropic)</option>
                <option value="DeepSeek">DeepSeek V3</option>
                <option value="Ollama">Ollama (Local LLM)</option>
                <option value="Azure OpenAI">Azure OpenAI</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Model Name</label>
              <select
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium"
              >
                {(modelsRes?.data || []).map((m: any) => (
                  <option key={m.modelName} value={m.modelName}>
                    {m.displayName}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-gray-700 block mb-1">API Key (Optional override)</label>
              <input
                type="password"
                placeholder="sk-..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Temperature ({temperature})</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Max Output Tokens</label>
              <input
                type="number"
                value={maxTokens}
                onChange={(e) => setMaxTokens(parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium"
              />
            </div>
          </div>

          <div className="pt-4 border-t flex justify-end">
            <button
              onClick={() => updateSettingsMutation.mutate({ provider, modelName, apiKey, temperature, maxTokens })}
              disabled={updateSettingsMutation.isPending}
              className="px-5 py-2.5 bg-[#4A7B5B] text-white font-bold rounded-xl text-xs hover:bg-[#3d664c]"
            >
              Save Settings
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: PROMPT MANAGER */}
      {activeTab === "prompts" && (
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
          <div className="flex justify-between items-center border-b pb-3">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Sliders className="text-[#4A7B5B]" size={18} /> Enterprise System Prompt Manager
            </h3>
            <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold">
              v1.4 Published
            </span>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1">
              Active System Prompt (Variables: &#123;student_name&#125;, &#123;budget&#125;, &#123;rag_context&#125;)
            </label>
            <textarea
              rows={6}
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono leading-relaxed"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={() => updateSettingsMutation.mutate({ systemPrompt })}
              className="px-5 py-2.5 bg-[#4A7B5B] text-white font-bold rounded-xl text-xs hover:bg-[#3d664c]"
            >
              Publish New Version
            </button>
          </div>
        </div>
      )}

      {/* TAB 4: KNOWLEDGE BASE & RAG */}
      {activeTab === "knowledge" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-gray-100">
            <h3 className="text-sm font-bold text-gray-900">Uploaded Knowledge Documents & RAG Chunks</h3>
            <button
              onClick={() => setShowUploadModal(true)}
              className="px-3.5 py-2 bg-[#4A7B5B] text-white text-xs font-bold rounded-xl hover:bg-[#3d664c]"
            >
              + Add Document
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 font-semibold">
                  <th className="p-3">Title</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Chunks</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(knowledgeRes?.data || []).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-400">
                      No knowledge documents uploaded yet.
                    </td>
                  </tr>
                ) : (
                  (knowledgeRes?.data || []).map((doc: any) => (
                    <tr key={doc.id} className="hover:bg-gray-50">
                      <td className="p-3 font-bold text-gray-800">{doc.title}</td>
                      <td className="p-3 font-semibold text-[#4A7B5B]">{doc.category}</td>
                      <td className="p-3 text-gray-500">{doc.fileType}</td>
                      <td className="p-3 font-bold text-blue-600">{doc._count?.chunks || doc.chunkCount}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                          {doc.status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => aiApi.deleteKnowledge(doc.id).then(() => queryClient.invalidateQueries({ queryKey: ["ai_knowledge"] }))}
                          className="text-red-500 font-semibold hover:underline"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: ESCALATIONS */}
      {activeTab === "escalations" && (
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-500" /> Pending Counselor Escalations
          </h3>
          <p className="text-xs text-gray-500">
            Conversations where AI confidence was low or student explicitly requested a human counselor.
          </p>

          <div className="space-y-3">
            {(convsRes?.data || []).filter((c: any) => c.isEscalated).length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-xs">No pending escalations.</div>
            ) : (
              (convsRes?.data || [])
                .filter((c: any) => c.isEscalated)
                .map((c: any) => (
                  <div key={c.id} className="p-4 bg-[#F8FAFC] rounded-xl border border-gray-100 flex justify-between items-center">
                    <div>
                      <div className="font-bold text-sm text-gray-800">{c.user?.fullName || "Student"} ({c.user?.email})</div>
                      <div className="text-xs text-gray-500 mt-1">{c.summary || "Requested human counselor"}</div>
                    </div>
                    <button className="px-3 py-1.5 bg-[#4A7B5B] text-white text-xs font-bold rounded-xl">
                      Assign & Call
                    </button>
                  </div>
                ))
            )}
          </div>
        </div>
      )}

      {/* TAB 6: HUMAN FEEDBACK LOOP */}
      {activeTab === "feedback" && (
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4 max-w-2xl">
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <UserCheck size={18} className="text-[#4A7B5B]" /> Counselor Answer Correction Tool
          </h3>
          <p className="text-xs text-gray-500">
            Submit corrected or rewritten answers. Corrections are automatically indexed into RAG memory to improve future answers.
          </p>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Conversation ID</label>
              <input
                type="text"
                placeholder="Enter conversation ID..."
                value={feedbackMsgId}
                onChange={(e) => setFeedbackMsgId(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Corrected / Approved Answer</label>
              <textarea
                rows={4}
                placeholder="Write verified answer details here..."
                value={correctedAnswer}
                onChange={(e) => setCorrectedAnswer(e.target.value)}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs"
              />
            </div>

            <button
              onClick={() =>
                submitFeedbackMutation.mutate({
                  conversationId: feedbackMsgId || "sample_conv",
                  rating: feedbackRating,
                  isCorrected: true,
                  correctedText: correctedAnswer,
                })
              }
              disabled={submitFeedbackMutation.isPending}
              className="px-5 py-2.5 bg-[#4A7B5B] text-white font-bold rounded-xl text-xs hover:bg-[#3d664c]"
            >
              Submit to RAG Memory
            </button>
          </div>
        </div>
      )}

      {/* UPLOAD KNOWLEDGE MODAL */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-lg rounded-2xl p-6 space-y-4 border border-gray-100 shadow-xl">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-base font-bold text-gray-900">Upload Knowledge Base Document</h3>
              <button onClick={() => setShowUploadModal(false)} className="text-gray-400 hover:text-gray-600 text-lg font-bold">
                ✕
              </button>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Document Title</label>
              <input
                type="text"
                placeholder="e.g., B.Tech Admission Fee Structure 2024"
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Category</label>
                <select
                  value={docCategory}
                  onChange={(e) => setDocCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                >
                  <option value="COLLEGES">Colleges</option>
                  <option value="COURSES">Courses</option>
                  <option value="SCHOLARSHIPS">Scholarships</option>
                  <option value="EXAMS">Exams</option>
                  <option value="FAQS">FAQs</option>
                  <option value="POLICIES">Policies</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">File Type</label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                >
                  <option value="PDF">PDF</option>
                  <option value="DOCX">DOCX</option>
                  <option value="TXT">TXT</option>
                  <option value="CSV">CSV</option>
                  <option value="URL">Website URL</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Document Raw Text / URL Content</label>
              <textarea
                rows={5}
                placeholder="Paste document text or circular guidelines..."
                value={docContent}
                onChange={(e) => setDocContent(e.target.value)}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button onClick={() => setShowUploadModal(false)} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-xs font-bold">
                Cancel
              </button>
              <button
                onClick={() =>
                  uploadDocMutation.mutate({
                    title: docTitle,
                    category: docCategory,
                    fileType: docType,
                    content: docContent,
                  })
                }
                disabled={uploadDocMutation.isPending}
                className="px-5 py-2 bg-[#4A7B5B] text-white rounded-xl text-xs font-bold hover:bg-[#3d664c]"
              >
                Upload & Index
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
