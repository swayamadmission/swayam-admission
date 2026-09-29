import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import {
  Bot,
  Send,
  X,
  Maximize2,
  ChevronDown,
  Sparkles,
  MapPin,
  GraduationCap,
  Scale,
  ExternalLink,
  Phone,
  MessageCircle,
  ShieldCheck,
  RotateCcw,
} from "lucide-react";
import {
  aiCounselorApi,
  AiMessage as Message,
} from "../../api/ai-counselor.api";

function renderInlineFormatting(str: string, isAi: boolean) {
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

function FormattedMarkdownText({ text, isAi }: { text: string; isAi: boolean }) {
  if (!text) return null;
  const lines = text.split("\n");

  return (
    <div className={`space-y-1 ${isAi ? "text-slate-800" : "text-white"}`}>
      {lines.map((line, idx) => {
        const trimmed = line.trim();

        if (trimmed.startsWith("### ")) {
          return (
            <h4 key={idx} className={`font-extrabold text-xs mt-1 mb-0.5 ${isAi ? "text-[#4A7B5B]" : "text-white"}`}>
              {trimmed.replace(/^###\s+/, "")}
            </h4>
          );
        }

        if (trimmed.startsWith("## ")) {
          return (
            <h3 key={idx} className={`font-extrabold text-xs mt-1 mb-0.5 ${isAi ? "text-[#4A7B5B]" : "text-white"}`}>
              {trimmed.replace(/^##\s+/, "")}
            </h3>
          );
        }

        if (trimmed.startsWith("* ") || trimmed.startsWith("- ")) {
          const bulletContent = trimmed.replace(/^[\*\-]\s+/, "");
          return (
            <div key={idx} className="flex items-start gap-1.5 pl-0.5 text-xs leading-relaxed">
              <span className={`inline-block w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${isAi ? "bg-[#4A7B5B]" : "bg-white"}`} />
              <div>{renderInlineFormatting(bulletContent, isAi)}</div>
            </div>
          );
        }

        if (/^\d+\.\s+/.test(trimmed)) {
          const num = trimmed.match(/^(\d+)\.\s+/)?.[1] || "•";
          const numContent = trimmed.replace(/^\d+\.\s+/, "");
          return (
            <div key={idx} className="flex items-start gap-1.5 pl-0.5 text-xs leading-relaxed">
              <span className={`font-bold text-xs shrink-0 ${isAi ? "text-[#4A7B5B]" : "text-white/90"}`}>{num}.</span>
              <div>{renderInlineFormatting(numContent, isAi)}</div>
            </div>
          );
        }

        if (!trimmed) {
          return <div key={idx} className="h-1" />;
        }

        return (
          <p key={idx} className="text-xs leading-relaxed">
            {renderInlineFormatting(line, isAi)}
          </p>
        );
      })}
    </div>
  );
}

export default function FloatingAICounselor() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "float_welcome",
      type: "ai",
      content:
        "Hi there! 👋 I am the **Swayam Admission AI Counselor**. How can I help you with colleges, courses, or admissions today?",
      chips: ["Top Colleges in Bihar", "B.Tech under ₹2L", "Compare Colleges", "Talk to Counselor"],
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const bottomRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Scroll to bottom when messages update
  useEffect(() => {
    if (isOpen) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping, isOpen]);

  // Load public AI config (welcome message, dynamic chips)
  useEffect(() => {
    aiCounselorApi
      .getConfig()
      .then((res) => {
        const cfg = res.data;
        if (cfg) {
          if (cfg.welcomeMessage || (cfg.suggestedChips && cfg.suggestedChips.length > 0)) {
            setMessages((prev) => {
              if (prev.length === 1 && prev[0].id === "float_welcome") {
                return [
                  {
                    id: "float_welcome",
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

  // Send message
  const handleSend = async (text: string) => {
    const safeText = (text || "").trim();
    if (!safeText) return;

    const userMsg: Message = {
      id: `usr_${Date.now()}`,
      type: "user",
      content: safeText,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    try {
      const res = await aiCounselorApi.chat({
        message: safeText,
        conversationId,
      });

      const payload = res?.data || {};
      if (payload.conversationId) setConversationId(payload.conversationId);

      // Sanitize natural text
      let cleanText = payload.reply || payload.content || (payload as any).text || "";
      if (cleanText.trim().startsWith("{") && cleanText.trim().endsWith("}")) {
        try {
          const parsed = JSON.parse(cleanText.trim());
          cleanText = parsed.reply || parsed.content || parsed.message || cleanText;
        } catch {
          // ignore
        }
      }

      const aiMsg: Message = {
        id: String(payload.messageId || `ai_${Date.now()}`),
        type: "ai",
        content: cleanText,
        reply: cleanText,
        chips: payload.chips || ["Explore Options", "Check Eligibility", "Talk to Counselor"],
        colleges: payload.colleges,
        courses: payload.courses,
        comparison: payload.comparison,
        counselorHandoff: payload.counselorHandoff,
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.error("Floating AI Chat Error:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          type: "ai",
          content:
            "I experienced a slight delay reaching the database. Would you like to retry or open the full counselor page?",
          chips: ["Retry", "Open Full Counselor", "Talk to Counselor"],
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      {/* Floating Launcher Button - positioned directly above WhatsApp button */}
      <div className="fixed bottom-[168px] sm:bottom-[104px] right-4 sm:right-6 z-40">
        {!isOpen && (
          <button
            onClick={() => setIsOpen(true)}
            aria-label="Open Swayam AI Counselor"
            className="group relative flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-[#4A7B5B] to-[#2d5e3f] text-white shadow-xl hover:scale-110 active:scale-95 transition-all duration-300 border-2 border-white/60 focus:outline-none"
          >
            {/* Pulsing notification dot */}
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#F0AE1A] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-[#F0AE1A] text-[9px] font-black text-slate-900 items-center justify-center">
                AI
              </span>
            </span>

            <Bot size={26} className="text-white group-hover:rotate-12 transition-transform duration-300" />

            {/* Hover Tooltip on Desktop */}
            <span className="hidden sm:block absolute right-16 px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg">
              Ask Swayam AI Counselor
            </span>
          </button>
        )}
      </div>

      {/* Floating Chat Drawer / Popup Window */}
      {isOpen && (
        <div className="fixed inset-x-4 bottom-4 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-[420px] h-[580px] max-h-[85vh] z-50 bg-white rounded-3xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-300">
          {/* Header */}
          <div className="p-3.5 px-4 bg-gradient-to-r from-[#4A7B5B] to-[#2d5e3f] text-white flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center text-white shrink-0">
                <Bot size={18} />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-extrabold text-xs sm:text-sm">Swayam AI Counselor</h3>
                  <span className="px-1.5 py-0.2 bg-[#F0AE1A] text-slate-900 text-[9px] font-black rounded-md">
                    LIVE
                  </span>
                </div>
                <p className="text-[10px] text-white/80">Direct university database grounding</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  setIsOpen(false);
                  navigate("/ai-counselor");
                }}
                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors text-white/90"
                title="Open Full Page"
              >
                <Maximize2 size={15} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors text-white/90"
                title="Close"
              >
                <X size={17} />
              </button>
            </div>
          </div>

          {/* Quick action bar */}
          <div className="bg-slate-50 border-b border-slate-100 px-3 py-1.5 flex items-center justify-between text-[11px] text-slate-600">
            <span className="flex items-center gap-1 text-[#4A7B5B] font-bold">
              <Sparkles size={12} /> Instant guidance
            </span>
            <Link
              to="/ai-counselor"
              className="text-[#4A7B5B] hover:underline font-bold text-[10px]"
            >
              Open Full Screen →
            </Link>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#F8FAFC]">
            {messages.map((m, idx) => {
              const isAi = m.type === "ai";
              return (
                <div key={m.id || idx} className="space-y-2">
                  <div className={`flex items-start gap-2.5 ${isAi ? "" : "justify-end"}`}>
                    {isAi && (
                      <div className="w-6 h-6 rounded-full bg-[#4A7B5B] flex items-center justify-center text-white shrink-0 mt-0.5 shadow-xs">
                        <Bot size={13} />
                      </div>
                    )}

                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed shadow-xs ${
                        isAi
                          ? "bg-white border border-slate-200/80 text-slate-800 rounded-tl-none"
                          : "bg-[#4A7B5B] text-white rounded-tr-none font-medium"
                      }`}
                    >
                      <FormattedMarkdownText text={m.content || m.reply || ""} isAi={isAi} />
                    </div>
                  </div>

                  {/* Mini Cards for Floating Widget */}
                  {isAi && (
                    <div className="pl-8 space-y-2">
                      {/* Mini College Cards */}
                      {Array.isArray(m.colleges) && m.colleges.length > 0 && (
                        <div className="space-y-1.5">
                          {m.colleges.slice(0, 2).map((c, i) => (
                            <div
                              key={c.id || i}
                              className="bg-white border border-slate-200 rounded-xl p-2.5 text-xs shadow-xs space-y-1"
                            >
                              <div className="flex justify-between items-start gap-1 font-bold text-[#4A7B5B]">
                                <span className="truncate">{c.name}</span>
                                {c.officialRank && (
                                  <span className="px-1.5 py-0.2 bg-[#4A7B5B] text-white text-[9px] rounded font-bold">
                                    #{c.officialRank}
                                  </span>
                                )}
                              </div>
                              <div className="flex justify-between text-[11px] text-slate-500">
                                <span>{c.location}</span>
                                <span className="font-bold text-slate-700">{c.fees}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Mini Comparison Note */}
                      {m.comparison && (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2 text-[11px] text-emerald-900 font-medium">
                          <div className="font-bold flex items-center gap-1 text-[#4A7B5B]">
                            <Scale size={13} /> Comparison Ready
                          </div>
                          <p className="mt-0.5 line-clamp-2">{m.comparison.verdict}</p>
                          <Link to="/ai-counselor" className="text-[#4A7B5B] font-bold underline mt-1 block">
                            View full comparison matrix →
                          </Link>
                        </div>
                      )}

                      {/* Mini Counselor Handoff */}
                      {m.counselorHandoff && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-2 text-xs flex items-center justify-between gap-2">
                          <span className="text-[11px] text-amber-900 font-bold">
                            Need human advice?
                          </span>
                          <Link
                            to="/ai-counselor"
                            className="px-2.5 py-1 bg-[#4A7B5B] text-white rounded-lg text-[10px] font-bold shrink-0"
                          >
                            Talk to Counselor
                          </Link>
                        </div>
                      )}

                      {/* Chips */}
                      {Array.isArray(m.chips) && m.chips.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          {m.chips.map((chip, cIdx) => (
                            <button
                              key={cIdx}
                              onClick={() => {
                                if (chip === "Open Full Counselor") {
                                  setIsOpen(false);
                                  navigate("/ai-counselor");
                                } else {
                                  handleSend(chip);
                                }
                              }}
                              className="px-2.5 py-1 bg-white border border-[#4A7B5B]/30 hover:bg-[#E8F3EC] text-[#4A7B5B] text-[11px] font-bold rounded-full transition-colors active:scale-95"
                            >
                              {chip}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {isTyping && (
              <div className="flex items-center gap-2 pl-2">
                <div className="w-5 h-5 rounded-full bg-[#4A7B5B] flex items-center justify-center text-white shrink-0">
                  <Bot size={11} />
                </div>
                <div className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl flex items-center gap-1 shadow-xs">
                  <span className="w-1.5 h-1.5 bg-[#4A7B5B] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 bg-[#4A7B5B] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 bg-[#4A7B5B] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input Footer */}
          <div className="p-3 bg-white border-t border-slate-200 flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Ask about colleges, fees, scholarships..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSend(input);
                  }
                }}
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#4A7B5B]"
              />
              <button
                onClick={() => handleSend(input)}
                disabled={!(input || "").trim() || isTyping}
                className="w-9 h-9 bg-[#4A7B5B] hover:bg-[#3d674c] disabled:opacity-40 text-white rounded-xl flex items-center justify-center transition-colors shrink-0 shadow-xs"
              >
                <Send size={14} />
              </button>
            </div>
            <p className="text-[10px] text-slate-400 text-center leading-tight px-1">
              AI guidance is for informational purposes only. Admission, eligibility, fees and other official information should be verified with Swayam Admission and the concerned institution.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
