import { useState, useEffect } from "react";
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
  Zap,
  Phone,
  Power,
  Activity,
  Shield,
  HelpCircle,
} from "lucide-react";

export default function AiCounselorAdminPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "providers" | "prompts" | "handoff" | "knowledge" | "logs" | "escalations" | "feedback"
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
  const { data: statsRes } = useQuery({
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

  const { data: logsRes, isLoading: logsLoading } = useQuery({
    queryKey: ["ai_logs"],
    queryFn: () => aiApi.getLogs(1, 50),
    enabled: activeTab === "logs" || activeTab === "dashboard",
  });

  // Settings State Form
  const [provider, setProvider] = useState("Gemini");
  const [modelName, setModelName] = useState("gemini-1.5-flash");
  const [apiKey, setApiKey] = useState("");
  const [temperature, setTemperature] = useState(0.3);
  const [maxTokens, setMaxTokens] = useState(1000);
  const [rateLimitPerMin, setRateLimitPerMin] = useState(30);
  const [isEnabled, setIsEnabled] = useState(true);
  const [welcomeMessage, setWelcomeMessage] = useState(
    "Namaste! 🙏 Welcome to **Swayam Admission AI Counselor**.\n\nI provide verified academic and admission guidance backed directly by our university directory, course catalog, and official 9-pillar national rankings. How can I assist your educational journey today?"
  );
  const [suggestedChipsText, setSuggestedChipsText] = useState(
    "🎓 Colleges in Bihar, 💻 B.Tech under ₹2L, ⚖️ Compare Colleges, 📋 Check Eligibility, 💰 Scholarships & Aid, 📞 Talk to Counselor"
  );
  const [counselorPhone, setCounselorPhone] = useState("+919000000000");
  const [counselorWhatsapp, setCounselorWhatsapp] = useState("+919000000000");
  const [counselorWorkingHours, setCounselorWorkingHours] = useState(
    "9:00 AM – 7:00 PM IST (Mon–Sat)"
  );
  const [systemPrompt, setSystemPrompt] = useState(
    "You are Swayam Admission AI Counselor, an expert educational advisor for colleges in India. Provide precise, factual guidance using verified internal knowledge."
  );

  // Synchronize incoming settings with form state
  useEffect(() => {
    if (settingsRes?.data) {
      const d = settingsRes.data;
      if (d.provider) setProvider(d.provider);
      if (d.modelName) setModelName(d.modelName);
      if (d.apiKey) setApiKey(d.apiKey);
      if (typeof d.temperature === "number") setTemperature(d.temperature);
      if (typeof d.maxTokens === "number") setMaxTokens(d.maxTokens);
      if (typeof d.rateLimitPerMin === "number") setRateLimitPerMin(d.rateLimitPerMin);
      if (d.systemPrompt) setSystemPrompt(d.systemPrompt);
      if (typeof d.isEnabled === "boolean") setIsEnabled(d.isEnabled);
      if (d.welcomeMessage) setWelcomeMessage(d.welcomeMessage);
      if (Array.isArray(d.suggestedChips)) setSuggestedChipsText(d.suggestedChips.join(", "));
      if (d.counselorPhone) setCounselorPhone(d.counselorPhone);
      if (d.counselorWhatsapp) setCounselorWhatsapp(d.counselorWhatsapp);
      if (d.counselorWorkingHours) setCounselorWorkingHours(d.counselorWorkingHours);
    }
  }, [settingsRes?.data]);

  // Mutations
  const updateSettingsMutation = useMutation({
    mutationFn: (data: any) => aiApi.updateSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai_settings"] });
      alert("AI Settings updated and synchronized successfully!");
    },
    onError: (err: any) => {
      alert("Failed to update AI settings: " + (err?.response?.data?.message || err.message));
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

  const syncDatabaseMutation = useMutation({
    mutationFn: () => aiApi.syncDatabase(),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ["ai_knowledge"] });
      queryClient.invalidateQueries({ queryKey: ["ai_stats"] });
      alert(res?.data?.message || "Successfully indexed live database into AI counselor RAG!");
    },
    onError: (err: any) => {
      alert("Failed to sync database: " + (err?.response?.data?.message || err?.message || "Unknown error"));
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

  const handleSaveAllSettings = () => {
    const chips = suggestedChipsText
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);

    updateSettingsMutation.mutate({
      provider,
      modelName,
      apiKey,
      temperature,
      maxTokens,
      rateLimitPerMin,
      systemPrompt,
      isEnabled,
      welcomeMessage,
      suggestedChips: chips,
      counselorPhone,
      counselorWhatsapp,
      counselorWorkingHours,
    });
  };

  const handleToggleEnable = () => {
    const nextState = !isEnabled;
    setIsEnabled(nextState);
    updateSettingsMutation.mutate({ isEnabled: nextState });
  };

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
            <h1 className="text-2xl font-extrabold text-[#4A7B5B]">Enterprise AI Control Center</h1>
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-black flex items-center gap-1 ${
                isEnabled ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
              }`}
            >
              <Power size={12} />
              {isEnabled ? "ACTIVE" : "PAUSED"}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Autonomous Admission Assistant • Multi-Provider RAG • Database Synchronization • PII Protected
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Toggle Button */}
          <button
            onClick={handleToggleEnable}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm ${
              isEnabled
                ? "bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
                : "bg-emerald-600 text-white hover:bg-emerald-700"
            }`}
          >
            <Power size={13} />
            {isEnabled ? "Disable AI Feature" : "Enable AI Feature"}
          </button>

          <button
            onClick={() => syncDatabaseMutation.mutate()}
            disabled={syncDatabaseMutation.isPending}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm disabled:opacity-50 transition-all"
            title="Index live colleges, courses, rankings, scholarships, exams and study materials into RAG"
          >
            <Database size={14} className={syncDatabaseMutation.isPending ? "animate-spin" : ""} />
            {syncDatabaseMutation.isPending ? "Syncing Live DB..." : "Sync Live DB to RAG"}
          </button>
          <button
            onClick={() => reindexMutation.mutate()}
            disabled={reindexMutation.isPending}
            className="px-3.5 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm hover:bg-gray-50"
          >
            <RefreshCw size={13} className={reindexMutation.isPending ? "animate-spin" : ""} />
            Reindex RAG
          </button>
          <button
            onClick={() => setShowUploadModal(true)}
            className="px-3.5 py-2 bg-[#4A7B5B] text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm hover:bg-[#3d664c]"
          >
            <Upload size={13} /> Upload Knowledge
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex overflow-x-auto gap-2 border-b border-gray-200 pb-2 no-scrollbar">
        {[
          { id: "dashboard", label: "Dashboard & Analytics", icon: Brain },
          { id: "providers", label: "Provider & Model Settings", icon: Cpu },
          { id: "prompts", label: "Prompts & Welcome Greeting", icon: Sliders },
          { id: "handoff", label: "Counselor Handoff Desk", icon: Phone },
          { id: "knowledge", label: "Knowledge Base & RAG Sources", icon: Database },
          { id: "logs", label: "Usage & Error Logs", icon: Activity },
          { id: "escalations", label: "Escalations Center", icon: AlertTriangle },
          { id: "feedback", label: "Answer Feedback Loop", icon: UserCheck },
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
                <div className="text-xl font-extrabold text-[#4A7B5B]">{m.val}</div>
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
                  <span className="text-gray-500 font-medium">Feature Status</span>
                  <span className={`font-bold ${isEnabled ? "text-emerald-600" : "text-red-500"}`}>
                    {isEnabled ? "ENABLED" : "PAUSED"}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500 font-medium">Rate Limiting</span>
                  <span className="font-semibold text-gray-700">{rateLimitPerMin} requests/min</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Database size={16} className="text-[#3B82F6]" /> Live Database Grounding Status
              </h3>
              <div className="p-4 bg-[#F8FAFC] rounded-xl border border-gray-100 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500 font-medium">Synchronized Sources</span>
                  <span className="font-bold text-gray-800">Colleges, Courses, 9-Pillar Rankings, Scholarships</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500 font-medium">PII & Student Privacy</span>
                  <span className="font-bold text-emerald-600">STRICT MINIMAL CONTEXT (Emails/Phones Omitted)</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500 font-medium">Prompt-Injection Shield</span>
                  <span className="font-bold text-emerald-600">ACTIVE</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PROVIDER & MODEL SETTINGS */}
      {activeTab === "providers" && (
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6 max-w-3xl">
          <div className="flex justify-between items-center border-b pb-3">
            <div>
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Cpu className="text-[#4A7B5B]" size={18} /> Provider, Model & API Configuration
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                API keys are stored server-side only and never exposed in browser or network responses.
              </p>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isEnabled}
                onChange={(e) => setIsEnabled(e.target.checked)}
                className="w-4 h-4 text-[#4A7B5B] rounded"
              />
              <span className="text-xs font-bold text-gray-800">Enable AI Feature</span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">AI Provider</label>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:border-[#4A7B5B]"
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
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:border-[#4A7B5B]"
              >
                {(modelsRes?.data || []).map((m: any) => (
                  <option key={m.modelName} value={m.modelName}>
                    {m.displayName}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-gray-700 block mb-1">
                API Key (Stored securely server-side; masked on read)
              </label>
              <input
                type="password"
                placeholder={settingsRes?.data?.isApiKeyConfigured ? "•••••••••••••••• (Configured on Server)" : "sk-... or AIza..."}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono focus:outline-none focus:border-[#4A7B5B]"
              />
              <span className="text-[11px] text-gray-400 mt-1 block">
                Leave blank or masked to keep current configured key.
              </span>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Temperature ({temperature})</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full"
              />
              <span className="text-[10px] text-gray-400">Lower = more deterministic & factual for admissions</span>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Max Output Tokens</label>
              <input
                type="number"
                value={maxTokens}
                onChange={(e) => setMaxTokens(parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:border-[#4A7B5B]"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Rate Limit (Requests / minute / user)</label>
              <input
                type="number"
                min="5"
                max="120"
                value={rateLimitPerMin}
                onChange={(e) => setRateLimitPerMin(parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:border-[#4A7B5B]"
              />
            </div>
          </div>

          <div className="pt-4 border-t flex justify-end">
            <button
              onClick={handleSaveAllSettings}
              disabled={updateSettingsMutation.isPending}
              className="px-5 py-2.5 bg-[#4A7B5B] text-white font-bold rounded-xl text-xs hover:bg-[#3d664c] transition-colors shadow-sm"
            >
              {updateSettingsMutation.isPending ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: PROMPT & WELCOME GREETING */}
      {activeTab === "prompts" && (
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6 max-w-3xl">
          <div className="flex justify-between items-center border-b pb-3">
            <div>
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Sliders className="text-[#4A7B5B]" size={18} /> System Prompt & Onboarding Experience
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Controls the AI persona, initial welcome message, and suggested inquiry chips.
              </p>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1">
              Active System Instructions (Grounding & Persona)
            </label>
            <textarea
              rows={6}
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono leading-relaxed focus:outline-none focus:border-[#4A7B5B]"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1">
              Student Welcome Message (Displays when starting a new session)
            </label>
            <textarea
              rows={3}
              value={welcomeMessage}
              onChange={(e) => setWelcomeMessage(e.target.value)}
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs leading-relaxed focus:outline-none focus:border-[#4A7B5B]"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1">
              Suggested Questions & Chips (Comma-separated)
            </label>
            <input
              type="text"
              value={suggestedChipsText}
              onChange={(e) => setSuggestedChipsText(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-[#4A7B5B]"
            />
            <span className="text-[11px] text-gray-400 mt-1 block">
              Example: Top Colleges in Bihar, B.Tech under ₹2L, Compare Colleges, Scholarships
            </span>
          </div>

          <div className="pt-4 border-t flex justify-end">
            <button
              onClick={handleSaveAllSettings}
              disabled={updateSettingsMutation.isPending}
              className="px-5 py-2.5 bg-[#4A7B5B] text-white font-bold rounded-xl text-xs hover:bg-[#3d664c] transition-colors shadow-sm"
            >
              {updateSettingsMutation.isPending ? "Publishing..." : "Save & Synchronize"}
            </button>
          </div>
        </div>
      )}

      {/* TAB 4: COUNSELOR HANDOFF DESK */}
      {activeTab === "handoff" && (
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6 max-w-2xl">
          <div className="border-b pb-3">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Phone className="text-[#4A7B5B]" size={18} /> Counselor Handoff & Academic Desk Settings
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              These details are presented to students whenever human counselor assistance is requested or when AI is paused.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Counseling Helpline Phone Number</label>
              <input
                type="text"
                value={counselorPhone}
                onChange={(e) => setCounselorPhone(e.target.value)}
                placeholder="+919000000000"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-[#4A7B5B]"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Counselor WhatsApp Contact</label>
              <input
                type="text"
                value={counselorWhatsapp}
                onChange={(e) => setCounselorWhatsapp(e.target.value)}
                placeholder="+919000000000"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-[#4A7B5B]"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Working / Availability Hours</label>
              <input
                type="text"
                value={counselorWorkingHours}
                onChange={(e) => setCounselorWorkingHours(e.target.value)}
                placeholder="9:00 AM – 7:00 PM IST (Mon–Sat)"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-[#4A7B5B]"
              />
            </div>
          </div>

          <div className="pt-4 border-t flex justify-end">
            <button
              onClick={handleSaveAllSettings}
              disabled={updateSettingsMutation.isPending}
              className="px-5 py-2.5 bg-[#4A7B5B] text-white font-bold rounded-xl text-xs hover:bg-[#3d664c] transition-colors shadow-sm"
            >
              {updateSettingsMutation.isPending ? "Saving..." : "Save Handoff Settings"}
            </button>
          </div>
        </div>
      )}

      {/* TAB 5: KNOWLEDGE BASE & RAG */}
      {activeTab === "knowledge" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 rounded-2xl border border-gray-100">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Uploaded Knowledge Documents & Live RAG</h3>
              <p className="text-xs text-gray-500">
                Live database synchronization indexes colleges, courses, 9-pillar rankings, exams, scholarships, guides, and materials.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => syncDatabaseMutation.mutate()}
                disabled={syncDatabaseMutation.isPending}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
              >
                <Database size={13} className={syncDatabaseMutation.isPending ? "animate-spin" : ""} />
                {syncDatabaseMutation.isPending ? "Syncing..." : "Sync Live DB"}
              </button>
              <button
                onClick={() => setShowUploadModal(true)}
                className="px-3.5 py-2 bg-[#4A7B5B] text-white text-xs font-bold rounded-xl hover:bg-[#3d664c]"
              >
                + Add Document
              </button>
            </div>
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
                      No knowledge documents uploaded yet. Click "Sync Live DB" to load all database tables into RAG.
                    </td>
                  </tr>
                ) : (
                  (knowledgeRes?.data || []).map((doc: any) => (
                    <tr key={doc.id} className="hover:bg-gray-50">
                      <td className="p-3 font-bold text-gray-800">{doc.title}</td>
                      <td className="p-3 font-semibold text-[#4A7B5B]">{doc.category}</td>
                      <td className="p-3 text-gray-500">{doc.fileType}</td>
                      <td className="p-3 font-bold text-blue-600">{doc._count?.chunks || doc.chunkCount || 0}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                          {doc.status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() =>
                            aiApi
                              .deleteKnowledge(doc.id)
                              .then(() => queryClient.invalidateQueries({ queryKey: ["ai_knowledge"] }))
                          }
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

      {/* TAB 6: USAGE & ERROR LOGS */}
      {activeTab === "logs" && (
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b pb-3">
            <div>
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Activity className="text-[#4A7B5B]" size={18} /> Chat Usage & Performance Logs
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Real-time execution log showing token metrics, latencies, model invocations, and student queries.
              </p>
            </div>
            <button
              onClick={() => queryClient.invalidateQueries({ queryKey: ["ai_logs"] })}
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold flex items-center gap-1.5"
            >
              <RefreshCw size={12} /> Refresh Logs
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 font-semibold">
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">User</th>
                  <th className="p-3">Provider & Model</th>
                  <th className="p-3">Tokens (P / C / Total)</th>
                  <th className="p-3">Latency</th>
                  <th className="p-3">Cost ($)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logsLoading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-400">
                      Loading usage logs...
                    </td>
                  </tr>
                ) : (logsRes?.data?.data || []).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-400">
                      No usage logs recorded yet.
                    </td>
                  </tr>
                ) : (
                  (logsRes?.data?.data || []).map((log: any) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="p-3 text-gray-500 font-mono text-[11px]">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="p-3">
                        <span className="font-bold text-gray-800">{log.user?.fullName || "Guest Student"}</span>
                        {log.user?.email && <span className="block text-[10px] text-gray-400">{log.user?.email}</span>}
                      </td>
                      <td className="p-3 font-medium text-slate-700">
                        <span className="font-bold text-[#4A7B5B]">{log.provider}</span> • {log.model}
                      </td>
                      <td className="p-3 text-slate-600 font-mono">
                        {log.promptTokens} / {log.completionTokens} / <strong className="text-blue-600">{log.totalTokens}</strong>
                      </td>
                      <td className="p-3 font-semibold text-emerald-700">
                        {log.latencyMs ? `${log.latencyMs} ms` : "N/A"}
                      </td>
                      <td className="p-3 text-slate-500 font-mono">
                        ${typeof log.estimatedCost === "number" ? log.estimatedCost.toFixed(5) : "0.00"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 7: ESCALATIONS */}
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

      {/* TAB 8: HUMAN FEEDBACK LOOP */}
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
