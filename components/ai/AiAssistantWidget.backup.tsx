'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Maximize2, Minimize2, X, ArrowUp, MessageSquare, Clock, Search, ChevronLeft, Sparkles, Home, FileText, CreditCard, HelpCircle } from 'lucide-react';
import { usePathname } from 'next/navigation';
import MarkdownRenderer from '@/components/MarkdownRenderer';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant' | string;
  content?: string;
  text?: string;
  parts?: Array<{ type: string; text?: string }>;
  quickActions?: string[];
  isSpecial?: boolean;
  timestamp?: number;
};

type ChatHistory = {
  id: string;
  title: string;
  preview: string;
  timestamp: number;
  messages: ChatMessage[];
};

function makeId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function extractText(message: ChatMessage): string {
  if (typeof message?.content === 'string') return message.content;
  if (typeof message?.text === 'string') return message.text;
  const parts = Array.isArray(message?.parts) ? message.parts : [];
  return parts
    .filter((p) => p && p.type === 'text')
    .map((p) => String(p.text || ''))
    .join('');
}

function isSalesPathname(pathname: string): boolean {
  const p = String(pathname || '/').toLowerCase();
  if (p.startsWith('/w/')) return false;
  if (p.includes('pricing')) return true;
  if (p.includes('landing')) return true;
  if (p.includes('subscribe')) return true;
  if (p.includes('solo')) return true;
  if (p.includes('the-operator')) return true;
  return false;
}

export function AiAssistantWidget() {
  const pathname = usePathname() || '/';
  if (String(pathname).startsWith('/w/')) return null;
  const isSales = useMemo(() => isSalesPathname(pathname), [pathname]);
  const personaLabel = isSales ? 'יועץ מכירות' : 'תמיכה טכנית';
  const fabIcon = isSales ? '💰' : '🤖';

  const [isOpen, setIsOpen] = useState(false);
  const [proactiveOpen, setProactiveOpen] = useState(false);
  const [isMedium, setIsMedium] = useState(false);
  const [view, setView] = useState<'chat' | 'history' | 'help'>('chat');
  const endRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatHistory[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const messagesRef = useRef<ChatMessage[]>([]);

  const [typedById, setTypedById] = useState<Record<string, string>>({});
  const typedByIdRef = useRef<Record<string, string>>({});
  const typingIntervalRef = useRef<any>(null);

  useEffect(() => {
    typedByIdRef.current = typedById;
  }, [typedById]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  async function sendText(text: string) {
    const trimmed = String(text || '').trim();
    if (!trimmed) return;
    if (isLoading) return;

    setError(null);

    const userMsg: ChatMessage = { id: makeId('user'), role: 'user', content: trimmed };
    const nextMessages = [...messagesRef.current, userMsg];
    setMessages(nextMessages);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          pathname,
          messages: nextMessages.map((m) => ({ role: m.role, content: extractText(m) })),
        }),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(txt || `Chat failed (${res.status})`);
      }

      const assistantText = await res.text();
      const assistantMsg: ChatMessage = { id: makeId('assistant'), role: 'assistant', content: String(assistantText || '') };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (e: any) {
      setError(String(e?.message || 'שגיאה בשליחת ההודעה'));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (isOpen) {
      setProactiveOpen(false);
      return;
    }

    // Show bubble after a short delay on all pages
    const t = window.setTimeout(() => {
      setProactiveOpen(true);
    }, 3000);

    return () => window.clearTimeout(t);
  }, [isOpen, pathname]);

  useEffect(() => {
    if (!isOpen) return;
    const el = endRef.current;
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  }, [isOpen, messages]);

  useEffect(() => {
    const msgs = (messages as any[]).filter((m: any) => m && m.role === 'assistant');
    if (!msgs.length) return;

    const pending = msgs.find((m: any) => {
      const id = String(m.id);
      const full = extractText(m);
      const current = typedByIdRef.current[id] ?? '';
      return current.length < full.length;
    });

    if (!pending) return;

    const id = String(pending.id);
    const full = extractText(pending);

    // If message contains markdown links or URLs, show it immediately
    const hasLinks = /\[.+?\]\(.+?\)/.test(full) || /https?:\/\//.test(full);
    if (hasLinks) {
      setTypedById((prev) => ({ ...prev, [id]: full }));
      return;
    }

    if (typingIntervalRef.current) {
      clearInterval(typingIntervalRef.current);
      typingIntervalRef.current = null;
    }

    const step = 1;
    typingIntervalRef.current = window.setInterval(() => {
      setTypedById((prev) => {
        const curr = prev[id] ?? '';
        if (curr.length >= full.length) {
          if (typingIntervalRef.current) {
            clearInterval(typingIntervalRef.current);
            typingIntervalRef.current = null;
          }
          return prev;
        }

        const next = full.slice(0, Math.min(full.length, curr.length + step));
        if (next === curr) return prev;
        return { ...prev, [id]: next };
      });

      const el = endRef.current;
      if (el) el.scrollIntoView({ behavior: 'auto' });
    }, 30);

    return () => {
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
        typingIntervalRef.current = null;
      }
    };
  }, [messages]);

  useEffect(() => {
    return () => {
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
        typingIntervalRef.current = null;
      }
    };
  }, []);

  const headerBg = isSales ? 'bg-slate-950' : 'bg-slate-900';
  const panelSize = isMedium
    ? 'w-[min(560px,calc(100vw-2rem))] h-[min(740px,calc(100vh-6rem))]'
    : 'w-[min(420px,calc(100vw-3rem))] h-[min(620px,calc(100vh-8rem))]';

  return (
    <>
      <div className="fixed bottom-6 right-6 z-[450]" dir="rtl">
        <div className="relative">
          <AnimatePresence>
            {proactiveOpen && !isOpen ? (
              <motion.button
                type="button"
                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.9 }}
                onClick={() => {
                  setIsOpen(true);
                  setProactiveOpen(false);
                }}
                className="absolute bottom-full mb-3 right-0 w-max max-w-[200px] hidden md:block"
              >
                <div className="bg-slate-900 text-white px-5 py-3 rounded-2xl rounded-br-sm shadow-2xl border border-slate-700/50">
                  <p className="text-sm font-bold text-right">איך אפשר לעזור?</p>
                  {/* Arrow */}
                  <div className="absolute -bottom-2 right-4 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[10px] border-t-slate-900" />
                </div>
              </motion.button>
            ) : null}
          </AnimatePresence>

          <button
            type="button"
            onClick={() => {
              setIsOpen((v) => !v);
              setProactiveOpen(false);
            }}
            className={`w-16 h-16 rounded-2xl shadow-2xl border border-white/30 text-white flex items-center justify-center ${
              isSales
                ? 'bg-slate-950 hover:bg-slate-900 shadow-[0_18px_60px_rgba(2,6,23,0.35)] border border-white/10'
                : 'bg-slate-900 hover:bg-slate-800'
            } transition-colors relative z-10`}
            aria-label="פתח עוזר חכם"
          >
            <span className="text-2xl leading-none">{fabIcon}</span>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isOpen ? (
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            className={`fixed bottom-28 right-6 z-[500] ${panelSize} bg-white rounded-[28px] shadow-2xl border border-slate-200 overflow-hidden flex flex-col`}
            dir="rtl"
          >
            <div className={`px-5 py-4 text-white flex items-center justify-between ${headerBg}`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center">
                  <span className="text-xl">{fabIcon}</span>
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-black truncate">MISRAD AI</div>
                  <div className="text-[11px] font-bold text-white/80 truncate">{personaLabel}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsMedium((v) => !v)}
                  className="w-10 h-10 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 flex items-center justify-center"
                  aria-label={isMedium ? 'הקטן חלון' : 'הרחב חלון'}
                >
                  {isMedium ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="w-10 h-10 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 flex items-center justify-center"
                  aria-label="סגור"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 bg-slate-50">
              <div className="space-y-3">
                {(messages as any[]).map((m: any) => {
                  const text = extractText(m);
                  const isUser = m.role === 'user';
                  const id = String(m.id);
                  const typed = typedById[id] ?? '';
                  const isTyping = !isUser && typed.length < text.length;
                  const displayText = isTyping ? typed : text;
                  
                  return (
                    <div key={String(m.id)} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`${isUser ? 'max-w-[85%]' : 'w-full'} rounded-2xl px-6 py-4 shadow-md text-base leading-relaxed ${
                          isUser
                            ? 'bg-slate-900 text-white border-none font-medium'
                            : 'bg-white text-slate-900 border border-slate-200'
                        }`}
                        style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
                        dir="rtl"
                      >
                        {isUser ? (
                          <div className="whitespace-pre-wrap">{text}</div>
                        ) : (
                          <div className="relative">
                            <MarkdownRenderer
                              content={displayText}
                              className="[&_p]:first:mt-0 [&_p]:last:mb-0"
                            />
                            {isTyping && <span className="opacity-70 ml-1">▍</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {isLoading ? (
                  <div className="flex justify-end">
                    <div className="max-w-[85%] rounded-2xl px-5 py-4 border border-slate-200 bg-white text-sm font-semibold text-slate-500 shadow-md">
                      ...
                    </div>
                  </div>
                ) : null}

                <div ref={endRef} />
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void sendText(input);
              }}
              className="p-3 bg-white border-t border-slate-200 flex items-center gap-2"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void sendText(input);
                  }
                }}
                placeholder={isSales ? 'שאל אותי על מחירים, חבילות וניסיון חינם...' : 'שאל אותי איך לבצע פעולה במערכת...'}
                className="flex-1 h-12 rounded-2xl border-2 border-slate-200 bg-white px-4 text-[15px] font-medium outline-none focus:outline-none focus:border-blue-500 transition-colors"
                style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !String(input || '').trim()}
                className="h-12 w-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:from-amber-500 hover:to-orange-600 hover:shadow-xl hover:shadow-orange-500/30 active:scale-95 transition-all focus:outline-none shadow-lg"
                aria-label="שלח"
              >
                <ArrowUp size={20} strokeWidth={3} />
              </button>
            </form>
            {error ? <div className="px-4 pb-3 text-xs font-bold text-rose-600 bg-white">{error}</div> : null}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
