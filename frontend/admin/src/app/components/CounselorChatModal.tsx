import React, { useState, useEffect, useRef } from "react";
import { X, Send, ShieldAlert, AlertCircle, RefreshCw, MessageSquare, GraduationCap, Building2 } from "lucide-react";
import { chatApi, ChatMessage, ConversationResponse } from "../../api/chat.api";

interface CounselorChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  applicationId?: string;
  applicationNumber?: string;
  studentName?: string;
  collegeName?: string;
  courseName?: string;
}

export const CounselorChatModal: React.FC<CounselorChatModalProps> = ({
  isOpen,
  onClose,
  applicationId,
  applicationNumber,
  studentName,
  collegeName,
  courseName,
}) => {
  const [conversation, setConversation] = useState<ConversationResponse | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadConversation = async () => {
    if (!applicationId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await chatApi.getOrCreateConversation(applicationId);
      setConversation(data as any);
      setMessages((data as any).messages || []);
      if ((data as any).conversationId) {
        await chatApi.markAsRead((data as any).conversationId);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || "Unable to load student conversation. Verify your assignment authorization.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadConversation();
    } else {
      setConversation(null);
      setMessages([]);
      setInputText("");
      setError(null);
    }
  }, [isOpen, applicationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed || !conversation?.conversationId || isSending) return;

    setIsSending(true);
    const clientKey = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    try {
      const newMsg = await chatApi.sendMessage(conversation.conversationId, trimmed, clientKey);
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg as any];
      });
      setInputText("");
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to send message. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl flex flex-col h-[640px] max-h-[92vh] border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-[#1E293B] text-white p-4 flex items-center justify-between shrink-0 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#4A7B5B] text-white flex items-center justify-center font-bold text-base shadow-sm">
              {studentName?.charAt(0) || conversation?.student?.displayName?.charAt(0) || "S"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-white">
                  {studentName || conversation?.student?.displayName || "Student Applicant"}
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#4A7B5B]/30 text-[#A7F3D0]">
                  Applicant
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5 flex items-center gap-1.5 flex-wrap">
                {applicationNumber && (
                  <span className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-[10px]">
                    {applicationNumber}
                  </span>
                )}
                {collegeName && (
                  <span className="flex items-center gap-1">
                    <Building2 size={11} className="text-slate-400" />
                    <span className="truncate max-w-[140px]">{collegeName}</span>
                  </span>
                )}
                {courseName && (
                  <span className="flex items-center gap-1">
                    <GraduationCap size={11} className="text-slate-400" />
                    <span className="truncate max-w-[140px]">{courseName}</span>
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadConversation}
              disabled={isLoading}
              title="Refresh conversation"
              className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* System Disclaimer Banner */}
        <div className="bg-amber-50/90 border-b border-amber-200/80 px-4 py-2.5 flex items-start gap-2.5 text-xs text-amber-900 shrink-0">
          <ShieldAlert size={16} className="text-amber-700 shrink-0 mt-0.5" />
          <div className="leading-snug text-[11px]">
            <span className="font-bold">Counselor Communication Policy:</span> This chat is only for career and admission guidance. Do not request or share passwords, OTPs, card information, banking credentials, or unnecessary sensitive personal information. Official payments must be conducted through Swayam Admission.
          </div>
        </div>

        {/* Message Thread Body */}
        <div className="flex-1 p-4 overflow-y-auto bg-slate-50/50 space-y-3">
          {isLoading && messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-2">
              <RefreshCw size={24} className="animate-spin text-[#4A7B5B]" />
              <p className="text-xs">Loading secure guidance channel...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-3">
              <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
                <AlertCircle size={24} />
              </div>
              <p className="text-xs text-rose-700 font-medium max-w-xs">{error}</p>
              <button
                onClick={loadConversation}
                className="px-4 py-1.5 bg-[#4A7B5B] text-white text-xs font-bold rounded-lg shadow-sm hover:bg-[#3d674c]"
              >
                Retry
              </button>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 text-slate-400 space-y-2">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-[#4A7B5B] flex items-center justify-center">
                <MessageSquare size={22} />
              </div>
              <h4 className="text-xs font-bold text-slate-700">Admission Guidance Channel Ready</h4>
              <p className="text-[11px] text-slate-500 max-w-xs">
                Start a conversation with the applicant to guide them through application milestones, eligibility, and program timelines.
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isCounselor = msg.senderRole === "COUNSELOR" || msg.senderRole === "ADMIN" || msg.senderRole === "SUPER_ADMIN";
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isCounselor ? "items-end" : "items-start"}`}
                >
                  <div className="flex items-center gap-1.5 mb-1 px-1">
                    <span className="text-[10px] font-bold text-slate-500">
                      {isCounselor ? "You (Counselor)" : msg.senderName || "Student"}
                    </span>
                    <span className="text-[9px] text-slate-400">
                      {new Date(msg.sentAt || msg.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs whitespace-pre-wrap break-words shadow-2xs ${
                      isCounselor
                        ? "bg-[#4A7B5B] text-white rounded-tr-xs"
                        : "bg-white text-slate-800 border border-slate-200/90 rounded-tl-xs"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSend} className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type guidance message (text only)..."
            maxLength={2000}
            disabled={isSending || isLoading || !conversation}
            className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4A7B5B] focus:bg-white transition-all disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isSending || isLoading || !conversation}
            className="px-4 py-2.5 bg-[#4A7B5B] hover:bg-[#3d674c] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
          >
            {isSending ? (
              <RefreshCw size={14} className="animate-spin" />
            ) : (
              <>
                <Send size={14} /> Send
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CounselorChatModal;
