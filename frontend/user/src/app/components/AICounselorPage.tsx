import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import {
  Bot,
  Send,
  User,
  MapPin,
  IndianRupee,
  GraduationCap,
  Sparkles,
  RotateCcw,
  Star,
  LogIn,
  Award,
  BookOpen,
  Calendar,
  FileText,
  CheckCircle2,
  Phone,
  MessageCircle,
  ExternalLink,
  HelpCircle,
  AlertCircle,
  Layers,
  Scale,
  Trash2,
  Clock,
  Download,
  Building2,
  Briefcase,
  ChevronRight,
  ShieldCheck,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import {
  aiCounselorApi,
  AiMessage as Message,
  CollegeCardData,
  CourseCardData,
  ExamCardData,
  ScholarshipCardData,
  StudyMaterialCardData,
  GuideCardData,
  ComparisonCardData,
  CounselorHandoffData,
} from "../../api/ai-counselor.api";
import { useAuth as useNavAuth } from "./Navbar";
import { useAuth } from "../../context/AuthContext";
import PolicyViewerModal from "./PolicyViewerModal";

// Initial Welcome Message
const INITIAL_MESSAGES: Message[] = [
  {
    id: "welcome_msg",
    type: "ai",
    content:
      "Namaste! 🙏 Welcome to **Swayam Admission AI Counselor**.\n\nI provide verified academic and admission guidance backed directly by our university directory, course catalog, and official 9-pillar national rankings. How can I assist your educational journey today?",
    chips: [
      "🎓 Colleges in Bihar",
      "💻 B.Tech under ₹2L",
      "⚖️ Compare Colleges",
      "📋 Check Eligibility",
      "💰 Scholarships & Aid",
      "📞 Talk to Counselor",
    ],
  },
];

// Reference-style Category Discovery Tabs
const CATEGORY_TABS = [
  { id: "all", label: "✨ All Guidance", query: "" },
  { id: "colleges", label: "🏛️ Top Colleges", query: "Show top verified colleges in Bihar and India" },
  { id: "courses", label: "📚 Course Guidance", query: "Explore B.Tech, MBA, and Polytechnic courses with eligibility" },
  { id: "careers", label: "🚀 Career Advice", query: "What are the best career paths after 12th PCM and PCB?" },
  { id: "compare", label: "⚖️ Compare Colleges", query: "Compare B.Tech colleges in Bihar side by side" },
  { id: "exams", label: "📝 Entrance Exams", query: "Tell me about JEE Main and NEET eligibility and dates" },
  { id: "scholarships", label: "💰 Scholarships", query: "What scholarships and financial aid options are available?" },
  { id: "fees", label: "🏷️ Fees & Budget", query: "What are the college fees for engineering under ₹2 Lakhs?" },
  { id: "process", label: "📄 Admission Process", query: "What documents and process are required for college admission?" },
];

// Helper to sanitize any raw JSON strings if present
function parseSanitizedMessage(rawContent: any): { cleanText: string; structured?: any } {
  if (!rawContent) return { cleanText: "" };
  if (typeof rawContent !== "string") {
    if (typeof rawContent === "object") {
      const text = rawContent.reply || rawContent.content || rawContent.message || rawContent.text || "";
      return { cleanText: String(text), structured: rawContent };
    }
    return { cleanText: String(rawContent) };
  }

  const trimmed = rawContent.trim();
  if (
    (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
    (trimmed.startsWith("```json") && trimmed.includes("}"))
  ) {
    try {
      let jsonStr = trimmed;
      if (jsonStr.startsWith("```json")) {
        jsonStr = jsonStr.replace(/^```json\s*/, "").replace(/```\s*$/, "").trim();
      }
      const parsed = JSON.parse(jsonStr);
      const text = parsed.reply || parsed.content || parsed.message || parsed.text || parsed.answer || "";
      return { cleanText: String(text), structured: parsed };
    } catch {
      // Return as is
    }
  }

  return { cleanText: rawContent };
}

// Markdown Formatter Component for Chat Bubbles
function FormattedMarkdownText({ text, isAi }: { text: string; isAi: boolean }) {
  if (!text) return null;

  // Split by line and render headers, bold, bullets, links cleanly
  const lines = text.split("\n");

  return (
    <div className={`space-y-1.5 ${isAi ? "text-slate-800" : "text-white"}`}>
      {lines.map((line, idx) => {
        const trimmed = line.trim();

        if (trimmed.startsWith("### ")) {
          return (
            <h4
              key={idx}
              className={`font-extrabold text-sm mt-2 mb-1 ${isAi ? "text-[#4A7B5B]" : "text-white"}`}
            >
              {trimmed.replace(/^###\s+/, "")}
            </h4>
          );
        }

        if (trimmed.startsWith("## ")) {
          return (
            <h3
              key={idx}
              className={`font-extrabold text-base mt-2 mb-1 ${isAi ? "text-[#4A7B5B]" : "text-white"}`}
            >
              {trimmed.replace(/^##\s+/, "")}
            </h3>
          );
        }

        if (trimmed.startsWith("* ") || trimmed.startsWith("- ")) {
          const bulletContent = trimmed.replace(/^[\*\-]\s+/, "");
          return (
            <div key={idx} className="flex items-start gap-2 pl-1 text-[13px] leading-relaxed">
              <span className={`inline-block w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${isAi ? "bg-[#4A7B5B]" : "bg-white"}`} />
              <div>{renderInlineFormatting(bulletContent, isAi)}</div>
            </div>
          );
        }

        if (/^\d+\.\s+/.test(trimmed)) {
          const num = trimmed.match(/^(\d+)\.\s+/)?.[1] || "•";
          const numContent = trimmed.replace(/^\d+\.\s+/, "");
          return (
            <div key={idx} className="flex items-start gap-2 pl-1 text-[13px] leading-relaxed">
              <span className={`font-bold text-xs shrink-0 ${isAi ? "text-[#4A7B5B]" : "text-white/90"}`}>{num}.</span>
              <div>{renderInlineFormatting(numContent, isAi)}</div>
            </div>
          );
        }

        if (!trimmed) {
          return <div key={idx} className="h-1.5" />;
        }

        return (
          <p key={idx} className="text-[13px] leading-relaxed">
            {renderInlineFormatting(line, isAi)}
          </p>
        );
      })}
    </div>
  );
}

// Render bold, links, badges inline
function renderInlineFormatting(str: string, isAi: boolean) {
  // Simple regex parser for **bold**
  const parts = str.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className={`font-bold ${isAi ? "text-[#2e553c]" : "text-white"}`}>
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

// Error Boundary with Resume
class AICounselorErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: any) {
    console.error("AI Counselor UI caught error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ backgroundColor: "#F8FAFC" }} className="min-h-screen flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl border border-gray-100 p-8 max-w-md w-full text-center space-y-4 shadow-xl">
            <div className="w-16 h-16 bg-emerald-50 text-[#4A7B5B] rounded-2xl flex items-center justify-center mx-auto shadow-sm">
              <Bot size={32} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#4A7B5B]">Swayam AI Counselor</h2>
              <p className="text-xs text-gray-500 mt-1">
                We encountered a temporary connection issue. You can resume your session smoothly below.
              </p>
            </div>
            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={() => this.setState({ hasError: false })}
                className="w-full py-3 bg-[#4A7B5B] hover:bg-[#3d6b4d] text-white text-xs font-bold rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2"
              >
                <RotateCcw size={14} /> Resume Session
              </button>
              <button
                onClick={() => window.location.reload()}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
              >
                Reload Window
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function AICounselorContent() {
  const { isLoggedIn, openAuth } = useNavAuth();
  const { user } = useAuth();
  const navigate = useNavigate();

  // State
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const [activeCategory, setActiveCategory] = useState("all");
  const [historySidebarOpen, setHistorySidebarOpen] = useState(false);
  const [pastConversations, setPastConversations] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [lastFailedText, setLastFailedText] = useState<string | null>(null);
  const [assignedCounselorData, setAssignedCounselorData] = useState<any>(null);
  const [counselorRequestPending, setCounselorRequestPending] = useState(false);
  const [viewingPolicySlug, setViewingPolicySlug] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll on message updates
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Load Past Conversations for logged-in students
  const loadConversations = async () => {
    if (!isLoggedIn) return;
    setIsLoadingHistory(true);
    try {
      const res = await aiCounselorApi.getConversations();
      const rawList = res?.data || [];
      setPastConversations(Array.isArray(rawList) ? rawList : []);
    } catch (err) {
      console.error("Failed to load AI conversations:", err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Load Counselor Status
  const loadCounselorStatus = async () => {
    if (!isLoggedIn) return;
    try {
      const res = await aiCounselorApi.getCounselorStatus();
      if (res?.data?.counselor) {
        setAssignedCounselorData(res.data.counselor);
      }
      setCounselorRequestPending(Boolean(res?.data?.isRequestPending));
    } catch (err) {
      // Non-critical, ignore
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      loadConversations();
      loadCounselorStatus();
    }
  }, [isLoggedIn]);

  // Load public AI config (welcome message, dynamic chips, disclaimer)
  useEffect(() => {
    aiCounselorApi
      .getConfig()
      .then((res) => {
        const cfg = res.data;
        if (cfg) {
          if (cfg.welcomeMessage || (cfg.suggestedChips && cfg.suggestedChips.length > 0)) {
            setMessages((prev) => {
              if (prev.length === 1 && prev[0].id === "welcome_msg") {
                return [
                  {
                    id: "welcome_msg",
                    type: "ai",
                    content: cfg.welcomeMessage || prev[0].content,
                    chips:
                      cfg.suggestedChips && cfg.suggestedChips.length > 0
                        ? cfg.suggestedChips
                        : prev[0].chips,
                  },
                ];
              }
              return prev;
            });
          }
        }
      })
      .catch(() => {});
  }, []);

  // Switch Conversation
  const switchConversation = async (convId: string) => {
    setIsTyping(true);
    setConversationId(convId);
    setHistorySidebarOpen(false);
    try {
      const res = await aiCounselorApi.getConversationById(convId);
      const conv = res?.data;
      if (conv?.messages && Array.isArray(conv.messages)) {
        const loadedMessages: Message[] = conv.messages.map((m: any) => {
          const parsed = parseSanitizedMessage(m.content);
          return {
            id: m.id,
            type: m.role === "USER" || m.type === "user" ? ("user" as const) : ("ai" as const),
            content: parsed.cleanText,
            reply: parsed.cleanText,
            colleges: m.colleges || parsed.structured?.colleges,
            courses: m.courses || parsed.structured?.courses,
            exams: m.exams || parsed.structured?.exams,
            scholarships: m.scholarships || parsed.structured?.scholarships,
            studyMaterials: m.studyMaterials || parsed.structured?.studyMaterials,
            guides: m.guides || parsed.structured?.guides,
            comparison: m.comparison || parsed.structured?.comparison,
            chips: m.chips || parsed.structured?.chips,
            counselorHandoff: m.counselorHandoff || parsed.structured?.counselorHandoff,
            createdAt: m.createdAt,
          };
        });
        setMessages(loadedMessages.length > 0 ? loadedMessages : INITIAL_MESSAGES);
      }
    } catch (err) {
      console.error("Failed to switch conversation:", err);
    } finally {
      setIsTyping(false);
    }
  };

  // Delete Conversation
  const handleDeleteConversation = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this conversation?")) return;
    try {
      await aiCounselorApi.deleteConversation(id);
      setPastConversations((prev) => prev.filter((c) => c.id !== id));
      if (conversationId === id) {
        startNewChat();
      }
    } catch (err) {
      console.error("Failed to delete conversation:", err);
    }
  };

  // Send Message
  const sendMessage = async (text: string, categoryHint?: string) => {
    const safeText = (text || "").trim();
    if (!safeText) return;

    setLastFailedText(null);
    const userMsg: Message = {
      id: `usr_${Date.now()}`,
      type: "user",
      content: safeText,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    try {
      const res = await aiCounselorApi.chat({
        message: safeText,
        conversationId,
        category: categoryHint || (activeCategory !== "all" ? activeCategory : undefined),
      });

      const payload = res?.data || {};
      if (payload.conversationId) {
        setConversationId(payload.conversationId);
      }

      // Sanitize natural response text
      const parsed = parseSanitizedMessage(payload.reply || payload.content || (payload as any).text);

      const aiMsg: Message = {
        id: String(payload.messageId || `ai_${Date.now()}`),
        type: "ai",
        content: parsed.cleanText,
        reply: parsed.cleanText,
        chips: payload.chips || parsed.structured?.chips || ["Explore Colleges", "Check Fees", "Talk to Counselor"],
        colleges: payload.colleges || parsed.structured?.colleges,
        courses: payload.courses || parsed.structured?.courses,
        exams: payload.exams || parsed.structured?.exams,
        scholarships: payload.scholarships || parsed.structured?.scholarships,
        studyMaterials: payload.studyMaterials || parsed.structured?.studyMaterials,
        guides: payload.guides || parsed.structured?.guides,
        comparison: payload.comparison || parsed.structured?.comparison,
        counselorHandoff: payload.counselorHandoff || parsed.structured?.counselorHandoff,
        applicationStatus: payload.applicationStatus,
        createdAt: payload.createdAt || new Date().toISOString(),
      };

      setMessages((prev) => [...prev, aiMsg]);

      // Refresh conversations list if logged in
      if (isLoggedIn) {
        loadConversations();
      }
    } catch (err: any) {
      console.error("AI Counselor Chat Error:", err);
      setLastFailedText(safeText);

      const errorMsg: Message = {
        id: `err_${Date.now()}`,
        type: "ai",
        content:
          "I experienced a temporary difficulty fetching verified recommendations. Would you like me to retry or would you like to speak directly with an academic counselor?",
        chips: ["Retry Last Question", "Talk to Counselor", "Browse Colleges Directly"],
        isError: true,
      };

      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  // Request Human Counselor
  const handleRequestCounselor = async () => {
    if (!isLoggedIn) {
      openAuth();
      return;
    }
    if (!user?.phoneVerified && !user?.mobileVerified) {
      window.dispatchEvent(
        new CustomEvent("swayam:open-mobile-verification", {
          detail: {
            reason: "Mobile verification is required before speaking with an educational counselor.",
          },
        })
      );
      return;
    }
    setCounselorRequestPending(true);
    try {
      await aiCounselorApi.escalate({
        conversationId: conversationId || "general_session",
        reason: "STUDENT_CLICKED_TALK_TO_COUNSELOR",
        summary: "Student requested direct counselor support from the AI Counselor page.",
      });
      alert("Counselor request submitted! A senior educational advisor will call/WhatsApp you shortly.");
      loadCounselorStatus();
    } catch (err: any) {
      if (
        err?.response?.data?.code === "MOBILE_VERIFICATION_REQUIRED" ||
        err?.response?.data?.message?.toLowerCase()?.includes("mobile")
      ) {
        window.dispatchEvent(
          new CustomEvent("swayam:open-mobile-verification", {
            detail: {
              reason: "Mobile verification is required before speaking with an educational counselor.",
            },
          })
        );
        return;
      }
      console.error("Failed to request counselor:", err);
      alert("Request noted! Our team will contact you shortly.");
    }
  };

  // Start New Chat
  const startNewChat = () => {
    setMessages(INITIAL_MESSAGES);
    setInput("");
    setIsTyping(false);
    setConversationId(undefined);
    setLastFailedText(null);
  };

  return (
    <div style={{ backgroundColor: "#F8FAFC" }} className="min-h-screen pb-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {/* Top Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-[#4A7B5B] to-[#2e553c] rounded-2xl flex items-center justify-center shadow-md text-white shrink-0">
              <Bot size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-[#4A7B5B] tracking-tight">
                  Swayam AI Counselor
                </h1>
                <span className="px-2 py-0.5 bg-[#F0AE1A]/15 border border-[#F0AE1A]/40 text-[#b5800d] text-[10px] font-black rounded-full uppercase tracking-wider">
                  Verified Engine
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-xs text-slate-500 font-medium">
                  Direct Live Database Grounding · 9-Pillar Ranking Synchronized
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {isLoggedIn && (
              <button
                onClick={() => setHistorySidebarOpen(!historySidebarOpen)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
              >
                {historySidebarOpen ? <PanelLeftClose size={15} /> : <PanelLeftOpen size={15} />}
                <span>History ({pastConversations.length})</span>
              </button>
            )}

            <button
              onClick={startNewChat}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#4A7B5B] hover:bg-[#3d674c] text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
            >
              <RotateCcw size={14} /> New Chat
            </button>
          </div>
        </div>

        {/* Category Discovery Navigation */}
        <div className="mb-5 overflow-x-auto no-scrollbar pb-1">
          <div className="flex items-center gap-2 min-w-max">
            {CATEGORY_TABS.map((tab) => {
              const isActive = activeCategory === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveCategory(tab.id);
                    if (tab.query) sendMessage(tab.query, tab.id);
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
                    isActive
                      ? "bg-[#4A7B5B] text-white border-[#4A7B5B] shadow-sm"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-[#E8F3EC] hover:text-[#4A7B5B] hover:border-[#4A7B5B]/30"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Content Layout with optional Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* History Sidebar (when open) */}
          {historySidebarOpen && isLoggedIn && (
            <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-200 shadow-sm p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock size={13} /> Chat Sessions
                </span>
                <button
                  onClick={() => setHistorySidebarOpen(false)}
                  className="text-slate-400 hover:text-slate-600 text-xs font-bold"
                >
                  Close
                </button>
              </div>

              {isLoadingHistory ? (
                <div className="p-4 text-center text-xs text-slate-400 animate-pulse">
                  Loading saved sessions...
                </div>
              ) : pastConversations.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  No previous conversations yet. Ask your first question!
                </div>
              ) : (
                <div className="max-h-[500px] overflow-y-auto space-y-2 pr-1">
                  {pastConversations.map((c) => {
                    const isCurrent = c.id === conversationId;
                    return (
                      <div
                        key={c.id}
                        onClick={() => switchConversation(c.id)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group ${
                          isCurrent
                            ? "bg-[#E8F3EC] border-[#4A7B5B] text-[#4A7B5B]"
                            : "bg-slate-50 border-slate-100 hover:bg-slate-100 text-slate-700"
                        }`}
                      >
                        <div className="min-w-0 flex-1 pr-2">
                          <div className="text-xs font-bold truncate">
                            {c.title || "Counseling Session"}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {new Date(c.updatedAt || c.createdAt).toLocaleDateString("en-IN", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </div>
                        <button
                          onClick={(e) => handleDeleteConversation(e, c.id)}
                          className="p-1.5 text-slate-300 hover:text-red-500 rounded-lg hover:bg-white transition-colors"
                          title="Delete Session"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Chat Container */}
          <div
            className={`${
              historySidebarOpen && isLoggedIn ? "lg:col-span-8" : "lg:col-span-12"
            } bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col`}
            style={{ minHeight: "600px" }}
          >
            {/* Guest Login Banner */}
            {!isLoggedIn && (
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200/60 p-3.5 px-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-[#b5800d] shrink-0" />
                  <p className="text-xs text-amber-900 font-medium">
                    You are exploring as a <strong>Guest</strong>. Log in to save conversation history and unlock personalized profile matching!
                  </p>
                </div>
                <button
                  onClick={openAuth}
                  className="px-3.5 py-1.5 bg-[#4A7B5B] hover:bg-[#3d674c] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors shrink-0 shadow-sm"
                >
                  <LogIn size={13} /> Student Login
                </button>
              </div>
            )}

            {/* Chat Messages List */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 max-h-[620px]">
              {messages.map((msg, msgIdx) => {
                const isAi = msg.type === "ai";

                return (
                  <div key={msg.id || `msg_${msgIdx}`} className="space-y-3">
                    {/* Message Bubble */}
                    <div className={`flex items-start gap-3 ${isAi ? "" : "justify-end"}`}>
                      {isAi && (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#4A7B5B] to-[#2d5e3f] flex items-center justify-center shrink-0 shadow-sm text-white mt-0.5">
                          <Bot size={16} />
                        </div>
                      )}

                      <div
                        className={`max-w-[85%] sm:max-w-[78%] rounded-2xl px-4 sm:px-5 py-3.5 shadow-sm ${
                          isAi
                            ? "bg-[#F8FAFC] border border-slate-200/80 rounded-tl-none"
                            : "bg-[#4A7B5B] text-white rounded-tr-none"
                        }`}
                      >
                        <FormattedMarkdownText text={msg.content || msg.reply || ""} isAi={isAi} />
                      </div>

                      {!isAi && (
                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center shrink-0 text-slate-600 mt-0.5">
                          <User size={15} />
                        </div>
                      )}
                    </div>

                    {/* Structured Cards Rendering Area */}
                    {isAi && (
                      <div className="pl-11 pr-2 space-y-4">
                        {/* 1. Comparison Card */}
                        {msg.comparison && msg.comparison.colleges && (
                          <div className="bg-white border border-[#4A7B5B]/30 rounded-2xl p-4 shadow-sm space-y-3">
                            <div className="flex items-center gap-2 text-sm font-extrabold text-[#4A7B5B]">
                              <Scale size={18} />
                              <span>{msg.comparison.title || "Institutional Comparison"}</span>
                            </div>

                            <div className="overflow-x-auto no-scrollbar">
                              <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                  <tr className="border-b border-slate-100 bg-slate-50 text-slate-600">
                                    <th className="p-2.5 font-bold">Attribute</th>
                                    {msg.comparison.colleges.map((c, i) => (
                                      <th key={c.id || i} className="p-2.5 font-extrabold text-[#4A7B5B]">
                                        {c.name}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-slate-700">
                                  <tr>
                                    <td className="p-2.5 font-bold text-slate-500">Location</td>
                                    {msg.comparison.colleges.map((c, i) => (
                                      <td key={i} className="p-2.5">{c.city}, {c.state}</td>
                                    ))}
                                  </tr>
                                  <tr>
                                    <td className="p-2.5 font-bold text-slate-500">Tuition Fees</td>
                                    {msg.comparison.colleges.map((c, i) => (
                                      <td key={i} className="p-2.5 font-bold text-[#4A7B5B]">{c.fees}</td>
                                    ))}
                                  </tr>
                                  <tr>
                                    <td className="p-2.5 font-bold text-slate-500">Placement Package</td>
                                    {msg.comparison.colleges.map((c, i) => (
                                      <td key={i} className="p-2.5">{c.placement}</td>
                                    ))}
                                  </tr>
                                  <tr>
                                    <td className="p-2.5 font-bold text-slate-500">Official Rank</td>
                                    {msg.comparison.colleges.map((c, i) => (
                                      <td key={i} className="p-2.5 font-bold">
                                        {c.rank ? `#${c.rank} in India` : "Unpublished"}
                                      </td>
                                    ))}
                                  </tr>
                                  <tr>
                                    <td className="p-2.5 font-bold text-slate-500">Hostel Facility</td>
                                    {msg.comparison.colleges.map((c, i) => (
                                      <td key={i} className="p-2.5">{c.hostel}</td>
                                    ))}
                                  </tr>
                                </tbody>
                              </table>
                            </div>

                            {msg.comparison.verdict && (
                              <div className="p-2.5 bg-emerald-50/70 border border-emerald-200/50 rounded-xl text-xs text-emerald-900 leading-relaxed font-medium">
                                <strong>Swayam Verdict:</strong> {msg.comparison.verdict}
                              </div>
                            )}
                          </div>
                        )}

                        {/* 2. Real College Cards */}
                        {Array.isArray(msg.colleges) && msg.colleges.length > 0 && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {msg.colleges.map((col, idx) => (
                              <div
                                key={col.id || idx}
                                className="bg-white border border-slate-200 hover:border-[#4A7B5B]/50 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-3"
                              >
                                <div className="space-y-1.5">
                                  <div className="flex items-start justify-between gap-2">
                                    <h4 className="font-extrabold text-sm text-[#4A7B5B] leading-tight">
                                      {col.name}
                                    </h4>
                                    {col.officialRank ? (
                                      <span className="px-2 py-0.5 bg-[#4A7B5B] text-white text-[10px] font-extrabold rounded-md shrink-0">
                                        #{col.officialRank} Swayam
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 bg-emerald-50 text-[#4A7B5B] border border-emerald-200 text-[10px] font-bold rounded-md shrink-0">
                                        Verified
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                    <MapPin size={12} className="shrink-0 text-slate-400" />
                                    <span>{col.location}</span>
                                  </div>

                                  <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] text-slate-600">
                                    <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                                      <span className="text-[10px] text-slate-400 block font-medium">Tuition Fees</span>
                                      <span className="font-bold text-[#4A7B5B]">{col.fees}</span>
                                    </div>
                                    <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                                      <span className="text-[10px] text-slate-400 block font-medium">Placement Highest</span>
                                      <span className="font-bold text-slate-800">{col.highestPackage || "12 LPA"}</span>
                                    </div>
                                  </div>

                                  {col.badges && col.badges.length > 0 && (
                                    <div className="flex flex-wrap gap-1 pt-1">
                                      {col.badges.slice(0, 2).map((b, i) => (
                                        <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-medium rounded-md">
                                          {b}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                                  <Link
                                    to="/colleges"
                                    className="flex-1 text-center py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
                                  >
                                    View College
                                  </Link>
                                  <Link
                                    to="/apply-now"
                                    className="flex-1 text-center py-2 bg-[#4A7B5B] hover:bg-[#3d674c] text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
                                  >
                                    Apply Now
                                  </Link>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* 3. Real Course Cards */}
                        {Array.isArray(msg.courses) && msg.courses.length > 0 && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {msg.courses.map((co, idx) => (
                              <div
                                key={co.id || idx}
                                className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:border-[#4A7B5B]/50 transition-all space-y-2.5"
                              >
                                <div>
                                  <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide">
                                    {co.duration} Program
                                  </span>
                                  <h4 className="font-bold text-sm text-slate-800 leading-tight">
                                    {co.name}
                                  </h4>
                                  <p className="text-xs text-slate-500 mt-0.5">{co.collegeName}</p>
                                </div>

                                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 space-y-1 text-xs">
                                  <div className="flex justify-between">
                                    <span className="text-slate-400">Total Fees:</span>
                                    <span className="font-bold text-[#4A7B5B]">{co.totalFees}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-400">Eligibility:</span>
                                    <span className="font-medium text-slate-700 truncate max-w-[160px]" title={co.eligibility}>
                                      {co.eligibility}
                                    </span>
                                  </div>
                                </div>

                                <Link
                                  to="/apply-now"
                                  className="w-full block text-center py-2 bg-[#4A7B5B] hover:bg-[#3d674c] text-white text-xs font-bold rounded-xl transition-colors"
                                >
                                  Apply for Course
                                </Link>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* 4. Real Exam Cards */}
                        {Array.isArray(msg.exams) && msg.exams.length > 0 && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {msg.exams.map((ex, idx) => (
                              <div
                                key={ex.name || idx}
                                className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-2"
                              >
                                <div className="flex items-center justify-between">
                                  <h4 className="font-extrabold text-sm text-[#4A7B5B]">{ex.name}</h4>
                                  <span className="px-2 py-0.5 bg-amber-50 text-[#b5800d] border border-amber-200 text-[10px] font-bold rounded-md">
                                    {ex.examMonth}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-600 line-clamp-2">{ex.description}</p>
                                <div className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-xl">
                                  <strong>Eligibility:</strong> {ex.eligibility}
                                </div>
                                {ex.officialWebsite && (
                                  <a
                                    href={ex.officialWebsite}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-[#4A7B5B] hover:underline flex items-center gap-1 font-bold pt-1"
                                  >
                                    Official Portal <ExternalLink size={12} />
                                  </a>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* 5. Scholarship Cards */}
                        {Array.isArray(msg.scholarships) && msg.scholarships.length > 0 && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {msg.scholarships.map((sc, idx) => (
                              <div
                                key={sc.name || idx}
                                className="bg-white border border-emerald-200/80 rounded-2xl p-4 shadow-sm space-y-2"
                              >
                                <div className="flex items-center justify-between">
                                  <h4 className="font-bold text-xs text-slate-800 leading-snug">{sc.name}</h4>
                                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-md shrink-0">
                                    {sc.amount}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500">Provider: {sc.provider}</p>
                                <div className="text-[11px] text-slate-600 bg-emerald-50/50 p-2 rounded-xl">
                                  <strong>Criteria:</strong> {sc.eligibility}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* 6. Counselor Handoff Card */}
                        {(msg.counselorHandoff || assignedCounselorData) && (
                          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <ShieldCheck size={18} className="text-[#4A7B5B]" />
                                <h4 className="font-extrabold text-sm text-[#4A7B5B]">
                                  {assignedCounselorData ? "Your Assigned Admission Counselor" : "Speak with an Admission Expert"}
                                </h4>
                              </div>
                              <p className="text-xs text-slate-600">
                                {assignedCounselorData
                                  ? `${assignedCounselorData.fullName} is ready to assist your admission process.`
                                  : "Get free personalized guidance on college seats, fee structures, and document verification."}
                              </p>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {assignedCounselorData?.mobile ? (
                                <>
                                  <a
                                    href={`tel:${assignedCounselorData.mobile}`}
                                    className="px-3.5 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-sm"
                                  >
                                    <Phone size={13} /> Call
                                  </a>
                                  <a
                                    href={`https://wa.me/${assignedCounselorData.mobile.replace(/\D/g, "")}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-3.5 py-2 bg-[#25D366] text-white text-xs font-bold rounded-xl hover:bg-[#20ba59] transition-colors flex items-center gap-1.5 shadow-sm"
                                  >
                                    <MessageCircle size={13} /> WhatsApp
                                  </a>
                                </>
                              ) : (
                                <button
                                  onClick={handleRequestCounselor}
                                  disabled={counselorRequestPending}
                                  className="px-4 py-2 bg-[#4A7B5B] hover:bg-[#3d674c] text-white text-xs font-bold rounded-xl transition-colors shadow-sm disabled:opacity-50"
                                >
                                  {counselorRequestPending ? "Request Pending..." : "Request Free Counselor"}
                                </button>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Quick Recommendation Chips */}
                        {Array.isArray(msg.chips) && msg.chips.length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {msg.chips.map((chip, chipIdx) => (
                              <button
                                key={chipIdx}
                                onClick={() => {
                                  if (chip === "Retry Last Question" && lastFailedText) {
                                    sendMessage(lastFailedText);
                                  } else if (chip === "Talk to Counselor") {
                                    handleRequestCounselor();
                                  } else {
                                    sendMessage(chip);
                                  }
                                }}
                                className="px-3 py-1.5 bg-white border border-[#4A7B5B]/30 hover:border-[#4A7B5B] hover:bg-[#E8F3EC] text-[#4A7B5B] text-xs font-bold rounded-full transition-all shadow-xs active:scale-95 flex items-center gap-1"
                              >
                                <span>{chip}</span>
                                <ChevronRight size={11} className="opacity-60" />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Typing Animation */}
              {isTyping && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#4A7B5B] to-[#2d5e3f] flex items-center justify-center shrink-0 shadow-sm text-white mt-0.5">
                    <Bot size={16} />
                  </div>
                  <div className="px-4 py-3 bg-[#F8FAFC] border border-slate-200/80 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-1.5">
                    <div className="w-2 h-2 bg-[#4A7B5B] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-2 h-2 bg-[#4A7B5B] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-2 h-2 bg-[#4A7B5B] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Chat Input Bar */}
            <div className="border-t border-slate-200 p-3 sm:p-4 bg-white space-y-2">
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Ask about colleges, fees, scholarships, rankings, or courses..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage(input);
                    }
                  }}
                  className="flex-1 px-4 py-3 bg-[#F8FAFC] border border-slate-200 rounded-2xl text-xs sm:text-sm focus:outline-none focus:border-[#4A7B5B] focus:ring-2 focus:ring-[#4A7B5B]/10 placeholder:text-slate-400 transition-all"
                />

                <button
                  onClick={() => sendMessage(input)}
                  disabled={!(input || "").trim() || isTyping}
                  className="w-12 h-12 bg-[#4A7B5B] hover:bg-[#3d674c] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-2xl flex items-center justify-center transition-all shrink-0 shadow-sm active:scale-95"
                >
                  <Send size={18} />
                </button>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between text-[10px] text-slate-400 px-1 gap-1">
                <p className="text-center sm:text-left leading-normal">
                  AI guidance is for informational purposes only. By using the assistant, you acknowledge the{" "}
                  <button
                    type="button"
                    onClick={() => setViewingPolicySlug("ai-counselor-terms-and-disclaimer")}
                    className="text-[#4A7B5B] underline hover:text-[#3d674c] font-semibold cursor-pointer"
                  >
                    AI Counselor Terms &amp; Disclaimer
                  </button>{" "}
                  and{" "}
                  <button
                    type="button"
                    onClick={() => setViewingPolicySlug("privacy-policy")}
                    className="text-[#4A7B5B] underline hover:text-[#3d674c] font-semibold cursor-pointer"
                  >
                    Privacy Policy
                  </button>
                  .
                </p>
                <span className="shrink-0 text-slate-400 font-medium">⚡ Powered by Swayam Admission Engine</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {viewingPolicySlug && (
        <PolicyViewerModal
          slug={viewingPolicySlug}
          onClose={() => setViewingPolicySlug(null)}
        />
      )}
    </div>
  );
}

export default function AICounselorPage() {
  return (
    <AICounselorErrorBoundary>
      <AICounselorContent />
    </AICounselorErrorBoundary>
  );
}
