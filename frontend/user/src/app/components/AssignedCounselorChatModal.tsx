import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Send,
  ShieldAlert,
  Loader2,
  Clock,
  Sparkles,
  AlertCircle,
  GraduationCap,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { chatApi, ChatMessage } from '../../api/chat.api';

interface AssignedCounselorChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  applicationId?: string;
  applicationNumber?: string;
  collegeName?: string;
  courseName?: string;
}

export default function AssignedCounselorChatModal({
  isOpen,
  onClose,
  applicationId,
  applicationNumber,
  collegeName,
  courseName,
}: AssignedCounselorChatModalProps) {
  const queryClient = useQueryClient();
  const [inputText, setInputText] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Fetch or initialize conversation for this application's assigned counselor
  const {
    data: convRes,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['assigned_counselor_chat', applicationId],
    queryFn: async () => {
      const res = await chatApi.getOrCreateConversation(applicationId);
      return res.data;
    },
    enabled: isOpen,
    refetchInterval: isOpen ? 4000 : false, // Auto-poll for live messages
  });

  const conversation = convRes?.conversation;
  const counselor = conversation?.counselor;
  const messages = conversation?.messages || [];
  const disclaimer =
    convRes?.disclaimer ||
    'Important: This chat is only for career and admission guidance. Please do not share passwords, OTPs, bank details, card details, Aadhaar/PAN numbers, or other highly sensitive personal information here. Official payment and application actions must be completed only through the Swayam Admission platform.';

  // Scroll to bottom on new messages
  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Mark as read when conversation is open
  useEffect(() => {
    if (isOpen && conversation?.id) {
      chatApi.markAsRead(conversation.id).catch(() => {});
      queryClient.invalidateQueries({ queryKey: ['chat_unread_count'] });
    }
  }, [isOpen, conversation?.id, queryClient]);

  // Send message mutation
  const sendMutation = useMutation({
    mutationFn: async ({ text }: { text: string }) => {
      if (!conversation?.id) throw new Error('No active conversation');
      const idemKey = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const res = await chatApi.sendMessage(conversation.id, text, idemKey);
      return res.data;
    },
    onSuccess: () => {
      setInputText('');
      setErrorMsg(null);
      refetch();
      queryClient.invalidateQueries({ queryKey: ['chat_unread_count'] });
    },
    onError: (err: any) => {
      const message =
        err?.response?.data?.message || err?.message || 'Failed to send message. Please try again.';
      setErrorMsg(message);
    },
  });

  const handleSend = () => {
    const trimmed = inputText.trim();
    if (!trimmed || sendMutation.isPending) return;
    setErrorMsg(null);
    sendMutation.mutate({ text: trimmed });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl flex flex-col h-[640px] max-h-[92vh] overflow-hidden border border-slate-200/80 animate-in zoom-in-95 duration-200">
        {/* ── HEADER ── */}
        <div className="bg-gradient-to-r from-[#2D5A3C] via-[#356345] to-[#4A7B5B] px-5 py-4 text-white flex items-center justify-between shadow-sm shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-md text-white flex items-center justify-center font-black text-lg border border-white/20 shrink-0 shadow-inner">
              {counselor?.fullName?.charAt(0) || <GraduationCap size={22} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-extrabold tracking-tight text-white leading-tight">
                  {counselor?.fullName || 'Assigned Educational Counselor'}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#A7F3D0]/20 text-[#A7F3D0] border border-[#A7F3D0]/30 uppercase tracking-wider">
                  Assigned Counselor
                </span>
              </div>
              <p className="text-xs text-emerald-100 font-medium mt-0.5 flex items-center gap-1.5">
                <span>{counselor?.designation || 'Senior Educational Counselor'}</span>
                {counselor?.qualification && (
                  <>
                    <span className="opacity-40">•</span>
                    <span>{counselor.qualification}</span>
                  </>
                )}
              </p>
              {(applicationNumber || collegeName || courseName) && (
                <p className="text-[11px] text-emerald-200/80 font-medium truncate max-w-xs mt-0.5">
                  Ref: {applicationNumber || 'Application'} {collegeName ? `• ${collegeName}` : ''}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer border border-white/15"
            aria-label="Close chat"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── POLICY / DISCLAIMER BANNER ── */}
        <div className="bg-amber-50/90 border-b border-amber-200/70 px-4 py-2.5 flex items-start gap-2.5 shrink-0 text-amber-900 text-xs">
          <ShieldAlert size={16} className="text-amber-700 shrink-0 mt-0.5" />
          <p className="text-[11px] leading-relaxed text-amber-800 font-medium">
            {disclaimer}
          </p>
        </div>

        {/* ── CHAT MESSAGES BODY ── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 bg-slate-50/70">
          {isLoading ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2">
              <Loader2 className="animate-spin text-[#4A7B5B]" size={28} />
              <p className="text-xs font-semibold">Connecting to assigned counselor...</p>
            </div>
          ) : isError || !counselor ? (
            <div className="h-full flex flex-col items-center justify-center p-6 text-center">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mb-3">
                <AlertCircle size={24} />
              </div>
              <h4 className="text-sm font-bold text-slate-800 mb-1">
                Your counselor has not been assigned yet.
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mb-4 leading-relaxed">
                Our admissions department is reviewing your application profile and will assign a dedicated academic counselor shortly.
              </p>
              <button
                onClick={() => refetch()}
                className="px-4 py-2 bg-[#4A7B5B] text-white rounded-xl text-xs font-bold hover:bg-[#3d694d] transition-all"
              >
                Check Assignment Status
              </button>
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
              <div className="w-14 h-14 rounded-3xl bg-[#E8F3EC] text-[#4A7B5B] flex items-center justify-center shadow-xs">
                <Sparkles size={26} />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-slate-800">
                  Start a conversation with {counselor.fullName}
                </h4>
                <p className="text-xs text-slate-500 max-w-sm mt-1 leading-relaxed">
                  Ask about course curriculum, college choices, admission criteria, fee payment timeline, or document verification.
                </p>
              </div>
            </div>
          ) : (
            messages.map((m: ChatMessage) => {
              const isMe = m.senderRole === 'STUDENT';
              const timeStr = m.sentAt
                ? new Date(m.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : '';

              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-1`}
                >
                  <div
                    className={`max-w-[82%] sm:max-w-[75%] rounded-2xl px-4 py-2.5 text-xs font-medium leading-relaxed shadow-2xs ${
                      isMe
                        ? 'bg-[#4A7B5B] text-white rounded-tr-xs'
                        : 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-xs'
                    }`}
                  >
                    {!isMe && (
                      <div className="text-[10px] font-bold text-[#4A7B5B] mb-1 flex items-center gap-1">
                        <span>{counselor?.fullName || 'Counselor'}</span>
                        <span className="text-slate-400 font-normal">• Counselor</span>
                      </div>
                    )}
                    <p className="whitespace-pre-wrap break-words">{m.text}</p>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-slate-400 px-1 font-semibold">
                    <Clock size={10} />
                    <span>{timeStr}</span>
                    {isMe && m.readAt && (
                      <span className="text-[#4A7B5B] font-bold ml-1">✓ Read</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* ── ERROR ALERT IF ANY ── */}
        {errorMsg && (
          <div className="px-4 py-1.5 bg-rose-50 border-t border-rose-200 text-rose-700 text-xs font-semibold flex items-center justify-between">
            <span>{errorMsg}</span>
            <button onClick={() => setErrorMsg(null)} className="text-rose-500 font-bold hover:text-rose-700">
              ✕
            </button>
          </div>
        )}

        {/* ── INPUT / ACTION BAR ── */}
        <div className="p-3 sm:p-4 bg-white border-t border-slate-200/80 shrink-0">
          <div className="flex items-end gap-2 bg-slate-50 border border-slate-200 rounded-2xl p-2 focus-within:border-[#4A7B5B] focus-within:bg-white transition-all">
            <textarea
              rows={2}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading || !counselor || sendMutation.isPending}
              placeholder={
                !counselor
                  ? 'Chat disabled until counselor is assigned...'
                  : 'Type your message to your assigned counselor... (Enter to send)'
              }
              maxLength={2000}
              className="flex-1 bg-transparent border-0 text-xs text-slate-800 placeholder-slate-400 focus:outline-none resize-none px-2 py-1 leading-relaxed"
            />
            <button
              onClick={handleSend}
              disabled={!inputText.trim() || sendMutation.isPending || !counselor}
              className="p-2.5 bg-[#4A7B5B] hover:bg-[#3d694d] disabled:opacity-40 disabled:hover:bg-[#4A7B5B] text-white rounded-xl transition-all flex items-center justify-center shrink-0 cursor-pointer shadow-xs"
              title="Send message"
            >
              {sendMutation.isPending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Send size={16} />
              )}
            </button>
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1.5 px-1 font-medium">
            <span>Text only • Shift + Enter for newline</span>
            <span>{inputText.length}/2000</span>
          </div>
        </div>
      </div>
    </div>
  );
}
