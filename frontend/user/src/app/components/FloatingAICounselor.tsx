import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import {
  Send,
  X,
  Maximize2,
  Scale,
  Phone,
  RotateCcw,
  Menu,
  Minus,
  History,
} from "lucide-react";
import {
  aiCounselorApi,
  AiMessage as Message,
} from "../../api/ai-counselor.api";

const ZIAF_GRADIENT =
  "linear-gradient(135deg, #43B5F5 0%, #08BD53 36%, #903C5A 72%, #F8CF98 100%)";

const ZIAF_SURFACE_WASH =
  "linear-gradient(180deg, #FFFFFF 58%, rgba(67, 181, 245, 0.08) 80%, rgba(8, 189, 83, 0.06) 91%, rgba(248, 207, 152, 0.14) 100%)";

const INITIAL_WELCOME: Message = {
  id: "float_welcome",
  type: "ai",
  content:
    "Hi there! I am **Ziaf AI**. How can I help you with colleges, courses, or admissions today?",
  chips: [
    "Top Colleges in Bihar",
    "B.Tech under ₹2L",
    "Compare Colleges",
    "Talk to Counselor",
  ],
};

function renderInlineFormatting(str: string, isAi: boolean) {
  const parts = str.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong
          key={i}
          className={`font-bold ${isAi ? "text-slate-900" : "text-white"}`}
        >
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
            <h4
              key={idx}
              className={`font-extrabold text-xs mt-1 mb-0.5 ${
                isAi ? "text-[#0e6b9e]" : "text-white"
              }`}
            >
              {trimmed.replace(/^###\s+/, "")}
            </h4>
          );
        }

        if (trimmed.startsWith("## ")) {
          return (
            <h3
              key={idx}
              className={`font-extrabold text-xs mt-1 mb-0.5 ${
                isAi ? "text-[#0e6b9e]" : "text-white"
              }`}
            >
              {trimmed.replace(/^##\s+/, "")}
            </h3>
          );
        }

        if (trimmed.startsWith("* ") || trimmed.startsWith("- ")) {
          const bulletContent = trimmed.replace(/^[\*\-]\s+/, "");
          return (
            <div
              key={idx}
              className="flex items-start gap-1.5 pl-0.5 text-xs leading-relaxed"
            >
              <span
                className={`inline-block w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                  isAi ? "bg-[#08BD53]" : "bg-white"
                }`}
              />
              <div>{renderInlineFormatting(bulletContent, isAi)}</div>
            </div>
          );
        }

        if (/^\d+\.\s+/.test(trimmed)) {
          const num = trimmed.match(/^(\d+)\.\s+/)?.[1] || "•";
          const numContent = trimmed.replace(/^\d+\.\s+/, "");
          return (
            <div
              key={idx}
              className="flex items-start gap-1.5 pl-0.5 text-xs leading-relaxed"
            >
              <span
                className={`font-bold text-xs shrink-0 ${
                  isAi ? "text-[#0e6b9e]" : "text-white/90"
                }`}
              >
                {num}.
              </span>
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

function AiBadgeGlyph({ active = false }: { active?: boolean }) {
  return (
    <span
      className={`inline-flex items-center justify-center w-6 h-6 rounded-[4px] border text-[10px] font-extrabold tracking-wide leading-none select-none ${
        active
          ? "border-transparent text-white"
          : "border-current text-current"
      }`}
      style={active ? { background: ZIAF_GRADIENT } : undefined}
    >
      AI
    </span>
  );
}

export default function FloatingAICounselor() {
  const [stage, setStage] = useState<"closed" | "launcher" | "chat">("closed");
  const [showAiInfo, setShowAiInfo] = useState(false);
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [messages, setMessages] = useState<Message[]>([INITIAL_WELCOME]);
  const [starterChips, setStarterChips] = useState<string[]>(
    INITIAL_WELCOME.chips || [],
  );
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>(
    undefined,
  );
  const bottomRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Scroll to bottom when messages update in chat view
  useEffect(() => {
    if (stage === "chat") {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping, stage]);

  // Load public AI config (welcome message, dynamic chips)
  useEffect(() => {
    aiCounselorApi
      .getConfig()
      .then((res) => {
        const cfg = res.data;
        if (cfg) {
          const normalizedWelcome = cfg.welcomeMessage
            ? cfg.welcomeMessage
                .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\uFE0F]/gu, "")
                .replace(/\s{2,}/g, " ")
                .replace(/Swayam (Admission )?AI Counselor/gi, "Ziaf AI")
                .trim()
            : INITIAL_WELCOME.content;
          const nextChips =
            cfg.suggestedChips && cfg.suggestedChips.length > 0
              ? cfg.suggestedChips
              : INITIAL_WELCOME.chips || [];
          setStarterChips(nextChips);

          setMessages((prev) => {
            if (prev.length === 1 && prev[0].id === "float_welcome") {
              return [
                {
                  id: "float_welcome",
                  type: "ai",
                  content: normalizedWelcome,
                  chips: nextChips,
                },
              ];
            }
            return prev;
          });
        }
      })
      .catch(() => {});
  }, []);

  const handleResetChat = () => {
    setConversationId(undefined);
    setMessages([{ ...INITIAL_WELCOME, chips: starterChips }]);
    setShowAiInfo(false);
    setShowHeaderMenu(false);
  };

  // Send message (transitions to full chat view automatically)
  const handleSend = async (text: string) => {
    const safeText = (text || "").trim();
    if (!safeText) return;

    setStage("chat");
    setShowAiInfo(false);
    setShowHeaderMenu(false);

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
      let cleanText =
        payload.reply || payload.content || (payload as any).text || "";
      if (cleanText.trim().startsWith("{") && cleanText.trim().endsWith("}")) {
        try {
          const parsed = JSON.parse(cleanText.trim());
          cleanText =
            parsed.reply || parsed.content || parsed.message || cleanText;
        } catch {
          // ignore
        }
      }

      const aiMsg: Message = {
        id: String(payload.messageId || `ai_${Date.now()}`),
        type: "ai",
        content: cleanText,
        reply: cleanText,
        chips: payload.chips || [
          "Explore Options",
          "Check Eligibility",
          "Talk to Counselor",
        ],
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
            "I experienced a slight delay reaching the database. Would you like to retry or open the full Ziaf AI page?",
          chips: ["Retry", "Open Full Counselor", "Talk to Counselor"],
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const renderGradientDock = (isLauncher: boolean) => (
    <div
      className={`w-full p-2 flex items-center gap-2 shrink-0 ${
        isLauncher ? "rounded-xl shadow-2xl" : "rounded-b-[14px]"
      }`}
      style={{ background: ZIAF_GRADIENT }}
    >
      <div className="flex-1 bg-white rounded-lg px-3 py-2 flex items-center gap-2 shadow-xs">
        <input
          type="text"
          placeholder="Hello! How can I help you?"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSend(input);
            }
          }}
          className="flex-1 min-w-0 bg-transparent text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none"
        />
        <button
          type="button"
          onClick={() => handleSend(input)}
          disabled={!(input || "").trim() || isTyping}
          aria-label="Send message to Ziaf AI"
          className="text-slate-600 hover:text-slate-900 disabled:opacity-35 transition-colors cursor-pointer shrink-0"
        >
          <Send size={15} />
        </button>
      </div>

      <button
        type="button"
        onClick={() => handleSend("Talk to Counselor")}
        title="Talk to Counselor"
        aria-label="Talk to Counselor"
        className="w-8 h-8 rounded-lg text-white hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer shrink-0 drop-shadow-xs"
      >
        <Phone size={16} />
      </button>

      <button
        type="button"
        onClick={() => {
          if (isLauncher) {
            setStage("chat");
          } else {
            setStage("closed");
            navigate("/ai-counselor");
          }
        }}
        title={isLauncher ? "Open Ziaf AI Chat" : "Open Full Screen"}
        aria-label={isLauncher ? "Open Ziaf AI Chat" : "Open Full Screen"}
        className="w-8 h-8 rounded-lg text-white hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer shrink-0 drop-shadow-xs"
      >
        {isLauncher ? <History size={16} /> : <Maximize2 size={15} />}
      </button>
    </div>
  );

  return (
    <>
      {/* Step 1: Collapsed Circular Launcher Button (IBM reference style) */}
      {stage === "closed" && (
        <div className="fixed bottom-[168px] sm:bottom-[104px] right-4 sm:right-6 z-40">
          <button
            type="button"
            onClick={() => setStage("launcher")}
            aria-label="Open Ziaf AI"
            style={{ background: ZIAF_GRADIENT }}
            className="group relative flex items-center justify-center w-14 h-14 rounded-full text-white shadow-xl hover:scale-105 active:scale-95 transition-all duration-200 border-2 border-white/80 focus:outline-none cursor-pointer"
          >
            <AiBadgeGlyph />
            <span className="hidden sm:block absolute right-16 px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg">
              Ask Ziaf AI
            </span>
          </button>
        </div>
      )}

      {/* Step 2: Quick Starter Chips + Gradient Input Dock */}
      {stage === "launcher" && (
        <div className="fixed bottom-[98px] sm:bottom-6 right-4 sm:right-6 z-50 flex flex-col items-end gap-2 w-[calc(100vw-2rem)] sm:w-[440px] animate-in fade-in slide-in-from-bottom-3 duration-200">
          <button
            type="button"
            onClick={() => setStage("closed")}
            aria-label="Close Ziaf AI bar"
            className="w-8 h-8 rounded-full bg-slate-200/95 hover:bg-slate-300 text-slate-700 flex items-center justify-center shadow-md transition-colors cursor-pointer"
          >
            <X size={15} />
          </button>

          <div className="flex flex-col items-end gap-2 w-full">
            {starterChips.slice(0, 3).map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSend(chip)}
                className="px-4 py-2 rounded-lg bg-white/95 hover:bg-white text-xs font-medium text-[#0e6b9e] shadow-sm transition-all hover:shadow-md active:scale-[0.99] cursor-pointer text-right"
                style={{
                  border: "1px solid rgba(67, 181, 245, 0.55)",
                }}
              >
                {chip}
              </button>
            ))}
          </div>

          {renderGradientDock(true)}
        </div>
      )}

      {/* Step 3 & 4: Full IBM-Style Chat Card with Gradient Frame & AI Info Popover */}
      {stage === "chat" && (
        <div
          className="fixed inset-x-4 bottom-4 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-[430px] h-[590px] max-h-[85vh] z-50 p-[1.5px] rounded-2xl shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-200"
          style={{ background: ZIAF_GRADIENT }}
        >
          <div className="relative h-full w-full bg-white rounded-[14.5px] flex flex-col overflow-hidden">
            {/* Clean Top Header Bar (Menu left, [AI] / Reset / Minimize right) */}
            <div className="relative px-3.5 py-2.5 bg-white border-b border-slate-200/80 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowHeaderMenu((prev) => !prev);
                    setShowAiInfo(false);
                  }}
                  aria-label="Ziaf AI menu"
                  className="p-1.5 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <Menu size={17} />
                </button>
                <span className="text-xs font-bold text-slate-800 tracking-tight">
                  Ziaf AI
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowAiInfo((prev) => !prev);
                    setShowHeaderMenu(false);
                  }}
                  aria-label="About Ziaf AI"
                  title="About Ziaf AI"
                  className="p-1 rounded-md text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <AiBadgeGlyph active={showAiInfo} />
                </button>
                <button
                  type="button"
                  onClick={handleResetChat}
                  aria-label="Reset conversation"
                  title="New conversation"
                  className="p-1.5 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <RotateCcw size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAiInfo(false);
                    setShowHeaderMenu(false);
                    setStage("closed");
                  }}
                  aria-label="Minimize Ziaf AI"
                  title="Minimize"
                  className="p-1.5 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <Minus size={16} />
                </button>
              </div>

              {/* Header Menu Dropdown */}
              {showHeaderMenu && (
                <div className="absolute top-12 left-3 w-52 bg-white rounded-xl border border-slate-200 shadow-xl py-1.5 z-30 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setShowHeaderMenu(false);
                      setStage("closed");
                      navigate("/ai-counselor");
                    }}
                    className="w-full px-3.5 py-2 text-left font-medium text-slate-700 hover:bg-slate-50 flex items-center justify-between cursor-pointer"
                  >
                    <span>Open Full Screen</span>
                    <Maximize2 size={13} className="text-slate-400" />
                  </button>
                  <button
                    type="button"
                    onClick={handleResetChat}
                    className="w-full px-3.5 py-2 text-left font-medium text-slate-700 hover:bg-slate-50 flex items-center justify-between cursor-pointer"
                  >
                    <span>Start New Chat</span>
                    <RotateCcw size={13} className="text-slate-400" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowHeaderMenu(false);
                      handleSend("Talk to Counselor");
                    }}
                    className="w-full px-3.5 py-2 text-left font-medium text-slate-700 hover:bg-slate-50 flex items-center justify-between cursor-pointer"
                  >
                    <span>Talk to Counselor</span>
                    <Phone size={13} className="text-slate-400" />
                  </button>
                </div>
              )}

              {/* Step 4: Powered by Ziaf AI Info Popover */}
              {showAiInfo && (
                <div
                  className="absolute top-12 right-3 left-3 sm:left-auto sm:w-[325px] rounded-xl p-[1px] shadow-2xl z-30 animate-in fade-in duration-150"
                  style={{ background: ZIAF_GRADIENT }}
                >
                  <div
                    className="rounded-[11px] p-5 space-y-3 text-slate-800"
                    style={{ background: ZIAF_SURFACE_WASH }}
                  >
                    <h4 className="text-sm font-bold text-slate-900">
                      Powered by Ziaf AI
                    </h4>
                    <p className="text-xs leading-relaxed text-slate-600">
                      Ziaf AI is powered by intelligent conversational models
                      grounded in our live college, course, exam, and
                      scholarship database to provide help whenever you need it.
                    </p>
                    <div className="pt-1">
                      <Link
                        to="/privacy-policy"
                        onClick={() => {
                          setShowAiInfo(false);
                          setStage("closed");
                        }}
                        className="text-xs font-semibold text-[#0e6b9e] hover:underline"
                      >
                        Read Swayam Admission&apos;s Privacy Policy
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Messages Area */}
            <div
              className="flex-1 overflow-y-auto p-4 space-y-3.5"
              style={{ background: ZIAF_SURFACE_WASH }}
            >
              {messages.map((m, idx) => {
                const isAi = m.type === "ai";
                return (
                  <div key={m.id || idx} className="space-y-2">
                    <div
                      className={`flex items-start gap-2.5 ${
                        isAi ? "" : "justify-end"
                      }`}
                    >
                      {isAi && (
                        <div
                          className="w-6 h-6 rounded-md flex items-center justify-center text-white shrink-0 mt-0.5 shadow-xs text-[9px] font-black tracking-wide"
                          style={{ background: ZIAF_GRADIENT }}
                        >
                          AI
                        </div>
                      )}

                      <div
                        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed shadow-xs ${
                          isAi
                            ? "bg-white border border-slate-200/80 text-slate-800 rounded-tl-none"
                            : "text-white rounded-tr-none font-medium"
                        }`}
                        style={!isAi ? { background: ZIAF_GRADIENT } : undefined}
                      >
                        <FormattedMarkdownText
                          text={m.content || m.reply || ""}
                          isAi={isAi}
                        />
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
                                <div className="flex justify-between items-start gap-1 font-bold text-slate-900">
                                  <span className="truncate">{c.name}</span>
                                  {c.officialRank && (
                                    <span
                                      className="px-1.5 py-0.2 text-white text-[9px] rounded font-bold shrink-0"
                                      style={{ background: ZIAF_GRADIENT }}
                                    >
                                      #{c.officialRank}
                                    </span>
                                  )}
                                </div>
                                <div className="flex justify-between text-[11px] text-slate-500">
                                  <span>{c.location}</span>
                                  <span className="font-bold text-slate-700">
                                    {c.fees}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Mini Comparison Note */}
                        {m.comparison && (
                          <div className="bg-sky-50/80 border border-sky-200 rounded-xl p-2 text-[11px] text-slate-800 font-medium">
                            <div className="font-bold flex items-center gap-1 text-[#0e6b9e]">
                              <Scale size={13} /> Comparison Ready
                            </div>
                            <p className="mt-0.5 line-clamp-2">
                              {m.comparison.verdict}
                            </p>
                            <Link
                              to="/ai-counselor"
                              onClick={() => setStage("closed")}
                              className="text-[#0e6b9e] font-bold underline mt-1 block"
                            >
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
                              onClick={() => setStage("closed")}
                              className="px-2.5 py-1 text-white rounded-lg text-[10px] font-bold shrink-0"
                              style={{ background: ZIAF_GRADIENT }}
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
                                type="button"
                                onClick={() => {
                                  if (chip === "Open Full Counselor") {
                                    setStage("closed");
                                    navigate("/ai-counselor");
                                  } else {
                                    handleSend(chip);
                                  }
                                }}
                                className="px-2.5 py-1 bg-white border border-[#43B5F5]/45 hover:border-[#08BD53] text-[#0e6b9e] text-[11px] font-semibold rounded-full transition-colors active:scale-95 cursor-pointer"
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
                  <div
                    className="w-5 h-5 rounded-md flex items-center justify-center text-white shrink-0 text-[8px] font-black"
                    style={{ background: ZIAF_GRADIENT }}
                  >
                    AI
                  </div>
                  <div className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl flex items-center gap-1 shadow-xs">
                    <span
                      className="w-1.5 h-1.5 bg-[#43B5F5] rounded-full animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    />
                    <span
                      className="w-1.5 h-1.5 bg-[#08BD53] rounded-full animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    />
                    <span
                      className="w-1.5 h-1.5 bg-[#903C5A] rounded-full animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* IBM-style Privacy & Verification Disclaimer */}
            <div className="px-4 py-2 bg-white/90 border-t border-slate-100 shrink-0">
              <p className="text-[10.5px] text-slate-600 leading-snug">
                By proceeding, you agree that Ziaf AI can process your queries
                to guide you with admissions. Please see{" "}
                <Link
                  to="/privacy-policy"
                  onClick={() => setStage("closed")}
                  className="text-[#0e6b9e] underline hover:text-[#094d73]"
                >
                  Swayam Admission&apos;s Privacy Policy
                </Link>{" "}
                and verify official details with the institution.
              </p>
            </div>

            {/* Bottom Gradient Input Dock */}
            {renderGradientDock(false)}
          </div>
        </div>
      )}
    </>
  );
}
