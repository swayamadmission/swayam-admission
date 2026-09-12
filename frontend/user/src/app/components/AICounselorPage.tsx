import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { Bot, Send, User, MapPin, IndianRupee, GraduationCap, Sparkles, RotateCcw, Star, LogIn } from "lucide-react";
import { aiCounselorApi, AiMessage as Message } from "../../api/ai-counselor.api";
import { useAuth } from "./Navbar";

const INITIAL_MESSAGES: Message[] = [
  {
    id: "1",
    type: "ai",
    content: "Namaste! 👋 I'm Swayam AI Counselor. I'm here to help you find the perfect college and course for your future.\n\nTo get started, tell me a bit about yourself:",
    chips: ["I'm after 12th", "I'm a graduate", "Looking for Engineering", "Looking for MBA"],
  },
];

const AI_RESPONSES: Record<string, Message> = {
  "I'm after 12th": {
    id: "", type: "ai",
    content: "Great! What stream did you study in 12th? And what's your approximate percentage?",
    chips: ["PCM – 70%+", "PCM – 50–70%", "Commerce – 70%+", "Arts – 70%+", "PCB – 70%+"],
  },
  "I'm a graduate": {
    id: "", type: "ai",
    content: "Excellent! Which course are you interested in for postgraduation?",
    chips: ["MBA / PGDM", "MCA", "M.Tech", "LLM", "M.Sc"],
  },
  "Looking for Engineering": {
    id: "", type: "ai",
    content: "Good choice! Engineering has excellent career opportunities. What's your JEE score or 12th PCM percentage?",
    chips: ["JEE Main 80+ %ile", "JEE Main 50–80 %ile", "12th 75%+ (no JEE)", "12th 60–75%"],
  },
  "Looking for MBA": {
    id: "", type: "ai",
    content: "MBA is a great career booster! Do you have CAT/MAT/CMAT scores, or are you looking for direct admission?",
    chips: ["CAT 70+ %ile", "MAT / CMAT", "Direct Admission", "Executive MBA"],
  },
  "PCM – 70%+": {
    id: "", type: "ai",
    content: "Excellent profile! 70%+ in PCM opens many top engineering colleges. What's your budget per year?",
    chips: ["Under ₹1L/yr", "₹1L–₹2L/yr", "₹2L–₹4L/yr", "Above ₹4L/yr"],
  },
  "Under ₹1L/yr": {
    id: "", type: "ai",
    content: "Great! I've found some excellent government colleges within your budget. Here are my top recommendations:",
    chips: ["Apply Now", "Get More Options", "Talk to Counselor"],
    colleges: [
      { id: "1", name: "Delhi Technical University", location: "Delhi NCR", fees: "₹85K/yr", rating: 4.5, match: 96 },
      { id: "2", name: "Kurukshetra University", location: "Haryana", fees: "₹65K/yr", rating: 4.2, match: 92 },
      { id: "3", name: "Rajasthan Technical University", location: "Kota, Rajasthan", fees: "₹75K/yr", rating: 4.1, match: 88 },
    ],
  },
  "₹1L–₹2L/yr": {
    id: "", type: "ai",
    content: "Perfect budget range! Here are top colleges with great placements in your budget:",
    chips: ["Apply Now", "See More Colleges", "Compare These"],
    colleges: [
      { id: "4", name: "Chandigarh University", location: "Punjab", fees: "₹1.8L/yr", rating: 4.6, match: 97 },
      { id: "5", name: "Lovely Professional University", location: "Punjab", fees: "₹1.5L/yr", rating: 4.4, match: 94 },
      { id: "6", name: "Galgotias University", location: "Greater Noida", fees: "₹1.6L/yr", rating: 4.1, match: 89 },
    ],
  },
  "₹2L–₹4L/yr": {
    id: "", type: "ai",
    content: "Great! With this budget you can access premium private universities with excellent facilities:",
    chips: ["Apply Now", "Get Scholarship Info", "Compare Colleges"],
    colleges: [
      { id: "7", name: "Amity University", location: "Noida, UP", fees: "₹3.5L/yr", rating: 4.3, match: 95 },
      { id: "8", name: "Sharda University", location: "Greater Noida", fees: "₹2.8L/yr", rating: 4.2, match: 91 },
      { id: "9", name: "Manav Rachna University", location: "Faridabad", fees: "₹2.5L/yr", rating: 4.0, match: 87 },
    ],
  },
  "Direct Admission": {
    id: "", type: "ai",
    content: "Direct MBA admission is available at many great universities. What's your budget?",
    chips: ["₹1L–₹2L/yr", "₹2L–₹4L/yr", "Above ₹4L/yr"],
  },
};

const DEFAULT_RESPONSE: Message = {
  id: "", type: "ai",
  content: "Thanks for sharing! Based on your profile, I'm analyzing the best options for you. Could you also tell me your preferred state for studies?",
  chips: ["Delhi NCR", "Uttar Pradesh", "Punjab / Haryana", "Any State is Fine"],
};

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class AICounselorErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("AI Counselor UI Error Caught:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ backgroundColor: "#F8FAFC" }} className="min-h-screen flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl border border-gray-100 p-8 max-w-md w-full text-center space-y-4 shadow-xl">
            <div className="w-16 h-16 bg-emerald-50 text-[#4A7B5B] rounded-2xl flex items-center justify-center mx-auto shadow-sm">
              <Bot size={32} />
            </div>
            <div>
              <h2 style={{ fontSize: "18px", fontWeight: 800, color: "#0F172A" }}>Swayam AI Counselor</h2>
              <p style={{ fontSize: "12px", color: "#64748b" }} className="mt-1">
                We encountered a temporary issue while loading your conversation. Click below to reconnect.
              </p>
            </div>
            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={this.handleRetry}
                className="w-full py-3 bg-[#4A7B5B] hover:bg-[#3d6b4d] text-white text-xs font-bold rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2"
              >
                <RotateCcw size={14} /> Resume Session
              </button>
              <button
                onClick={() => window.location.reload()}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
              >
                Refresh Page
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
  const { isLoggedIn, openAuth } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    if (isLoggedIn) {
      aiCounselorApi
        .getHistory()
        .then((res: any) => {
          const rawData = res?.data?.data || res?.data || [];
          const rawList = Array.isArray(rawData) ? rawData : [];

          const allMessages: any[] = [];
          rawList.forEach((item: any) => {
            if (Array.isArray(item?.messages)) {
              allMessages.push(...item.messages);
            } else if (item && (item.content || item.text || item.message)) {
              allMessages.push(item);
            }
          });

          if (allMessages.length > 0) {
            const formattedHistory: Message[] = allMessages
              .map((msg: any, idx: number) => {
                const textContent = String(msg?.content || msg?.text || msg?.message || "");
                return {
                  id: String(msg?.id || `hist_${idx}_${Date.now()}`),
                  type: (msg?.role === "USER" || msg?.type === "user") ? ("user" as const) : ("ai" as const),
                  content: textContent,
                  chips: Array.isArray(msg?.chips) ? msg.chips : undefined,
                  colleges: Array.isArray(msg?.colleges) ? msg.colleges : undefined,
                };
              })
              .filter((m) => (m.content || "").trim() !== "");

            if (formattedHistory.length > 0) {
              setMessages([...INITIAL_MESSAGES, ...formattedHistory]);
            }
          }
        })
        .catch((err: any) => console.error("Failed to fetch AI history", err));
    }
  }, [isLoggedIn]);

  const sendMessage = async (text: string) => {
    const safeText = (text || "").trim();
    if (!safeText) return;
    if (!isLoggedIn) {
      openAuth();
      return;
    }
    const userMsg: Message = { id: Date.now().toString(), type: "user", content: safeText };
    setMessages((prev) => [...(prev || []), userMsg]);
    setInput("");
    setIsTyping(true);

    try {
      const res = await aiCounselorApi.chat({ message: safeText, conversationId });
      const payload = res?.data?.data || res?.data || {};
      if (payload?.conversationId) setConversationId(payload.conversationId);

      const rawContent = payload?.content || payload?.text || payload?.message || payload?.answer;
      const finalContent = typeof rawContent === "string" && rawContent.trim() ? rawContent : DEFAULT_RESPONSE.content;

      const sources = Array.isArray(payload?.retrievedSources)
        ? payload.retrievedSources
        : Array.isArray(payload?.sources)
        ? payload.sources
        : [];

      const collegesList = sources
        .filter((s: any) => s && (s.category === "COLLEGE_DB" || s.type === "COLLEGE"))
        .map((c: any, idx: number) => ({
          id: String(c?.id || `col_${idx}`),
          name: String(c?.title || c?.name || "Partner University"),
          location: String(c?.location || "Verified Campus"),
          fees: String(c?.fees || "Verified Fees"),
          rating: Number(c?.rating || 4.8),
          match: 95 - idx * 2,
        }));

      const responseMsg: Message = {
        id: String(payload?.messageId || payload?.id || Date.now()),
        type: "ai",
        content: finalContent,
        chips: ["Explore B.Tech", "Explore MBA", "Check Scholarships", "Talk to Human Counselor"],
        colleges: collegesList.length > 0 ? collegesList : undefined,
      };
      setMessages((prev) => [...(prev || []), responseMsg]);
    } catch (e) {
      console.error("AI Counselor Chat Error:", e);
      const fallbackResponse = AI_RESPONSES[safeText] || DEFAULT_RESPONSE;
      setMessages((prev) => [...(prev || []), { ...fallbackResponse, id: Date.now().toString() }]);
    } finally {
      setIsTyping(false);
    }
  };

  const reset = () => {
    setMessages(INITIAL_MESSAGES);
    setInput("");
    setIsTyping(false);
    setConversationId(undefined);
  };

  return (
    <div style={{ backgroundColor: "#F8FAFC" }} className="min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-[#4A7B5B] to-[#2d5e3f] rounded-2xl flex items-center justify-center shadow-md">
              <Bot size={24} className="text-white" />
            </div>
            <div>
              <h1 style={{ fontSize: "18px", fontWeight: 800, color: "#0F172A" }}>Swayam AI Counselor</h1>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-[#25D366] rounded-full animate-pulse" />
                <span style={{ fontSize: "12px", color: "#64748b" }}>Online · Responds instantly</span>
              </div>
            </div>
          </div>
          <button
            onClick={reset}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <RotateCcw size={13} /> New Chat
          </button>
        </div>

        {/* Feature chips */}
        <div className="flex gap-2 flex-wrap mb-5">
          {["Course Guidance", "College Matching", "Scholarship Info", "Career Advice"].map((f) => (
            <span
              key={f}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-full"
              style={{ fontSize: "11px", fontWeight: 500, color: "#4A7B5B" }}
            >
              <Sparkles size={11} />
              {f}
            </span>
          ))}
        </div>

        {/* Chat window */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col" style={{ minHeight: "520px" }}>
          {/* Chat area */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4" style={{ maxHeight: "480px" }}>
            {!isLoggedIn && (
              <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <h3 className="text-blue-900 font-semibold text-sm">Login Required</h3>
                  <p className="text-blue-700 text-xs mt-0.5">Please login to chat with the Swayam AI Counselor.</p>
                </div>
                <button
                  onClick={openAuth}
                  className="px-4 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1.5"
                >
                  <LogIn size={14} /> Login
                </button>
              </div>
            )}

            {(messages || []).map((msg, msgIdx) => (
              <div key={msg?.id || `msg_${msgIdx}`}>
                {/* Message bubble */}
                <div className={`flex items-end gap-2.5 ${msg?.type === "user" ? "justify-end" : ""}`}>
                  {msg?.type === "ai" && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#4A7B5B] to-[#2d5e3f] flex items-center justify-center shrink-0 shadow-sm">
                      <Bot size={14} className="text-white" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      msg?.type === "ai"
                        ? "bg-[#F8FAFC] text-gray-700 rounded-tl-none border border-gray-100"
                        : "bg-[#4A7B5B] text-white rounded-tr-none"
                    }`}
                    style={{ fontSize: "13px", lineHeight: 1.6 }}
                  >
                    {(msg?.content ?? "").split("\n").map((line, i, arr) => (
                      <span key={i}>
                        {line}
                        {i < arr.length - 1 && <br />}
                      </span>
                    ))}
                  </div>
                  {msg?.type === "user" && (
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
                      <User size={14} className="text-gray-500" />
                    </div>
                  )}
                </div>

                {/* College recommendation cards */}
                {Array.isArray(msg?.colleges) && msg.colleges.length > 0 && (
                  <div className="ml-10 mt-3 space-y-2">
                    {msg.colleges.map((col, idx) => (
                      <Link
                        key={col?.id || col?.name || `col_${idx}`}
                        to="/colleges"
                        className="flex items-center gap-3 p-3 bg-white border border-[#4A7B5B]/20 rounded-2xl hover:shadow-md transition-all hover:border-[#4A7B5B]/40 group"
                      >
                        <div className="w-10 h-10 bg-[#E8F3EC] rounded-xl flex items-center justify-center shrink-0">
                          <GraduationCap size={18} className="text-[#4A7B5B]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div style={{ fontSize: "13px", fontWeight: 700, color: "#0F172A" }} className="truncate">
                            {col?.name || "Partner University"}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="flex items-center gap-0.5" style={{ fontSize: "11px", color: "#94a3b8" }}>
                              <MapPin size={9} />
                              {col?.location || "Verified Campus"}
                            </span>
                            <span className="flex items-center gap-0.5" style={{ fontSize: "11px", color: "#94a3b8" }}>
                              <IndianRupee size={9} />
                              {col?.fees || "Verified Fees"}
                            </span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="px-2 py-0.5 bg-[#4A7B5B] text-white rounded-lg" style={{ fontSize: "10px", fontWeight: 700 }}>
                            {col?.match || 90}% Match
                          </div>
                          <div className="flex items-center gap-0.5 justify-end mt-1">
                            <Star size={9} className="fill-[#F0AE1A] text-[#F0AE1A]" />
                            <span style={{ fontSize: "10px", color: "#94a3b8" }}>{col?.rating || 4.5}</span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}

                {/* Quick chips */}
                {Array.isArray(msg?.chips) && msg.chips.length > 0 && msg?.type === "ai" && (
                  <div className="ml-10 mt-3 flex flex-wrap gap-2">
                    {msg.chips.map((chip, idx) => (
                      <button
                        key={chip || `chip_${idx}`}
                        onClick={() => sendMessage(chip)}
                        className="px-3 py-1.5 bg-white border border-[#4A7B5B]/30 text-[#4A7B5B] rounded-full hover:bg-[#E8F3EC] hover:border-[#4A7B5B] transition-all"
                        style={{ fontSize: "12px", fontWeight: 500 }}
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <div className="flex items-end gap-2.5">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#4A7B5B] to-[#2d5e3f] flex items-center justify-center shrink-0">
                  <Bot size={14} className="text-white" />
                </div>
                <div className="px-4 py-3 bg-[#F8FAFC] border border-gray-100 rounded-2xl rounded-tl-none">
                  <div className="flex gap-1 items-center">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="w-2 h-2 bg-[#4A7B5B] rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input area */}
          <div className="border-t border-gray-100 p-4">
            <div className="flex gap-2 items-center">
              <input
                type="text"
                placeholder="Type your message or question..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
                className="flex-1 px-4 py-3 bg-[#F8FAFC] border border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-[#4A7B5B] focus:ring-2 focus:ring-[#4A7B5B]/10 placeholder:text-gray-400"
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!(input || "").trim() || isTyping || !isLoggedIn}
                className="w-11 h-11 bg-[#4A7B5B] text-white rounded-2xl flex items-center justify-center hover:bg-[#3d6b4d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              >
                <Send size={16} />
              </button>
            </div>
            <p className="text-center mt-2" style={{ fontSize: "10px", color: "#cbd5e1" }}>
              Swayam AI · Free counseling · Not a substitute for official admission advice
            </p>
          </div>
        </div>
      </div>
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
