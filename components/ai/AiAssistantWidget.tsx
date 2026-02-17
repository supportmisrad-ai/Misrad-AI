'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { 
  Maximize2, Minimize2, X, ArrowUp, MessageSquare, Clock, 
  Search, ChevronLeft, Sparkles, Home, FileText, CreditCard, 
  CircleHelp, Check, Zap, TrendingUp, Users, Calendar 
} from 'lucide-react';
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

type KnowledgeItem = {
  id: string;
  category: string;
  title: string;
  content: string;
  keywords: string[];
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

// Quick Actions לפי סוג
const SALES_QUICK_ACTIONS = [
  'מה התוכניות הזמינות?',
  'כמה עולה המערכת?',
  'איך מתחילים?',
  'יש תקופת ניסיון?'
];

const SUPPORT_QUICK_ACTIONS = [
  'איך מוסיפים לקוח חדש?',
  'איך משנים סטטוס עסקה?',
  'איך מייצאים דוח?',
  'איך משתמשים בעוזר הקולי?'
];

// Knowledge Base
const KNOWLEDGE_BASE: KnowledgeItem[] = [
  {
    id: 'kb-1',
    category: 'תחילת עבודה',
    title: 'יצירת ארגון ראשון',
    content: 'כדי ליצור ארגון חדש, לחץ על כפתור + בסרגל העליון ובחר "ארגון חדש". מלא את הפרטים ולחץ שמור.',
    keywords: ['ארגון', 'חדש', 'יצירה', 'התחלה']
  },
  {
    id: 'kb-2',
    category: 'ניהול לקוחות',
    title: 'הוספת לקוח חדש',
    content: 'עבור למודול CRM, לחץ "לקוח חדש", מלא את הפרטים הבסיסיים (שם, טלפון, אימייל) ולחץ שמור.',
    keywords: ['לקוח', 'חדש', 'CRM', 'הוספה']
  },
  {
    id: 'kb-3',
    category: 'דוחות',
    title: 'ייצוא דוחות',
    content: 'בכל מודול, לחץ על אייקון ה-Excel בפינה השמאלית העליונה כדי לייצא את הנתונים לקובץ Excel.',
    keywords: ['דוח', 'ייצוא', 'Excel', 'נתונים']
  },
  {
    id: 'kb-4',
    category: 'מנויים',
    title: 'שדרוג תוכנית',
    content: 'עבור להגדרות > מנוי, בחר את התוכנית הרצויה ולחץ "שדרג עכשיו". השינוי יכנס לתוקף מיידית.',
    keywords: ['מנוי', 'שדרוג', 'תוכנית', 'תשלום']
  }
];

export function AiAssistantWidget() {
  const pathname = usePathname() || '/';
  const hideOnWorkspace = String(pathname).startsWith('/w/');
  
  const isSales = useMemo(() => isSalesPathname(pathname), [pathname]);
  const personaName = 'איציק';
  const personaRole = isSales ? 'יועץ מכירות' : 'נציג תמיכה';
  const personaAvatar = '👨';
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
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackHelpful, setFeedbackHelpful] = useState<boolean | null>(null);

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

  // Load chat history from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('misrad-ai-chat-history');
    if (stored) {
      try {
        setChatHistory(JSON.parse(stored));
      } catch {}
    }
  }, []);

  // Save messages to history
  useEffect(() => {
    if (messages.length > 0 && currentChatId) {
      const updatedHistory = chatHistory.map(h => 
        h.id === currentChatId 
          ? { ...h, messages, timestamp: Date.now(), preview: extractText(messages[messages.length - 1]).slice(0, 80) }
          : h
      );
      setChatHistory(updatedHistory);
      localStorage.setItem('misrad-ai-chat-history', JSON.stringify(updatedHistory));
    }
  }, [messages]);

  async function sendText(text: string) {
    const trimmed = String(text || '').trim();
    if (!trimmed) return;
    if (isLoading) return;

    setError(null);

    // Create new chat if needed
    if (!currentChatId) {
      const newChatId = makeId('chat');
      setCurrentChatId(newChatId);
      const newChat: ChatHistory = {
        id: newChatId,
        title: trimmed.slice(0, 50),
        preview: trimmed.slice(0, 80),
        timestamp: Date.now(),
        messages: []
      };
      const updated = [newChat, ...chatHistory];
      setChatHistory(updated);
      localStorage.setItem('misrad-ai-chat-history', JSON.stringify(updated));
    }

    const userMsg: ChatMessage = { 
      id: makeId('user'), 
      role: 'user', 
      content: trimmed,
      timestamp: Date.now()
    };
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
      
      // חילוץ כפתורים דינמיים מה-API
      let content = assistantText;
      let quickActions: string[] = [];
      
      try {
        // בדיקה אם יש JSON בסוף התשובה
        const jsonMatch = assistantText.match(/\n\n(\{[^}]*"quickActions"[^}]*\})\s*$/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[1]);
          if (Array.isArray(parsed.quickActions)) {
            quickActions = parsed.quickActions;
            content = assistantText.replace(jsonMatch[0], '').trim();
          }
        }
      } catch {
        // אם אין JSON או שגיאה, השתמש בברירת מחדל
        quickActions = (isSales ? SALES_QUICK_ACTIONS : SUPPORT_QUICK_ACTIONS).slice(0, 3);
      }
      
      // אם אין כפתורים, השתמש בברירת מחדל
      if (quickActions.length === 0) {
        quickActions = (isSales ? SALES_QUICK_ACTIONS : SUPPORT_QUICK_ACTIONS).slice(0, 3);
      }
      
      const assistantMsg: ChatMessage = { 
        id: makeId('assistant'), 
        role: 'assistant', 
        content: String(content || ''),
        quickActions: quickActions,
        timestamp: Date.now()
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (e: unknown) {
      setError(String(e instanceof Error ? e.message : e || 'שגיאה בשליחת ההודעה'));
    } finally {
      setIsLoading(false);
    }
  }

  // Typing animation
  useEffect(() => {
    const msgs = (messages as ChatMessage[]).filter((m) => m && m.role === 'assistant');
    if (!msgs.length) return;

    const pending = msgs.find((m) => {
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

    const step = 3;
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
    }, 15);

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

  useEffect(() => {
    if (isOpen) {
      setProactiveOpen(false);
      return;
    }

    const t = window.setTimeout(() => {
      setProactiveOpen(true);
    }, 500);

    return () => window.clearTimeout(t);
  }, [isOpen, pathname]);

  useEffect(() => {
    if (!isOpen) return;
    const el = endRef.current;
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  }, [isOpen, messages]);

  const headerBg = isSales ? 'bg-slate-950' : 'bg-slate-900';
  const panelSize = isMedium
    ? 'w-[min(640px,calc(100vw-1rem))] h-[min(820px,calc(100vh-2rem))] md:w-[640px] md:h-[820px]'
    : 'w-[calc(100vw-1rem)] h-[calc(100vh-2rem)] sm:w-[min(480px,calc(100vw-2rem))] sm:h-[min(720px,calc(100vh-6rem))]';

  const filteredKnowledge = searchQuery 
    ? KNOWLEDGE_BASE.filter(k => 
        k.title.includes(searchQuery) || 
        k.content.includes(searchQuery) ||
        k.keywords.some(kw => kw.includes(searchQuery))
      )
    : KNOWLEDGE_BASE;

  const quickActionsToShow = isSales ? SALES_QUICK_ACTIONS : SUPPORT_QUICK_ACTIONS;

  if (hideOnWorkspace) return null;

  return (
    <>
      {/* FAB */}
      <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[450]" dir="rtl">
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
                className="absolute bottom-full mb-3 right-0 w-max max-w-[220px] hidden md:block"
              >
                <div className="bg-slate-900 text-white px-6 py-4 rounded-2xl rounded-br-sm shadow-2xl border border-slate-700/50">
                  <p className="text-[15px] font-bold text-right leading-snug">💬 איך אפשר לעזור?</p>
                  <div className="absolute -bottom-2 right-5 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[10px] border-t-slate-900" />
                </div>
              </motion.button>
            ) : null}
          </AnimatePresence>

          <motion.button
            type="button"
            onClick={() => {
              setIsOpen((v) => !v);
              setProactiveOpen(false);
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-800 text-white shadow-xl border-2 border-slate-200/40 flex items-center justify-center transition-all hover:shadow-slate-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 ring-offset-2 relative z-10"
            aria-label="פתח עוזר חכם"
          >
            <span className="text-xl sm:text-2xl leading-none">{fabIcon}</span>
          </motion.button>
        </div>
      </div>

      {/* Main Panel */}
      <AnimatePresence>
        {isOpen ? (
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            className={`fixed bottom-0.5 right-0.5 sm:bottom-28 sm:right-6 z-[500] ${panelSize} bg-white rounded-2xl sm:rounded-[28px] shadow-2xl border border-slate-200 overflow-hidden flex flex-col`}
            dir="rtl"
          >
            {/* Header with Tabs */}
            <div className={`${headerBg} text-white flex flex-col`}>
              <div className="px-3 py-3 sm:px-5 sm:py-4 flex items-center justify-between">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                  <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-500 border-2 border-white/30 flex items-center justify-center shadow-lg flex-shrink-0">
                    <span className="text-xl sm:text-2xl">{personaAvatar}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm sm:text-[15px] font-black truncate">{personaName}</div>
                    <div className="text-[11px] sm:text-[12px] font-bold text-white/80 truncate">{personaRole} • MISRAD AI</div>
                  </div>
                </div>
                <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsMedium((v) => !v)}
                    className="hidden sm:flex w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 items-center justify-center transition-colors"
                    aria-label={isMedium ? 'הקטן חלון' : 'הרחב חלון'}
                  >
                    {isMedium ? <Minimize2 size={16} className="sm:w-[18px] sm:h-[18px]" /> : <Maximize2 size={16} className="sm:w-[18px] sm:h-[18px]" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 flex items-center justify-center transition-colors"
                    aria-label="סגור"
                  >
                    <X size={16} className="sm:w-[18px] sm:h-[18px]" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMessages([]);
                      setShowFeedback(true);
                      setCurrentChatId(null);
                    }}
                    className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 flex items-center justify-center transition-colors"
                    aria-label="סיים שיחה"
                  >
                    <Check size={16} className="sm:w-[18px] sm:h-[18px]" />
                  </button>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex border-t border-white/10">
                <button
                  onClick={() => setView('chat')}
                  className={`flex-1 px-2 py-2.5 sm:px-4 sm:py-3 text-xs sm:text-[13px] font-bold flex items-center justify-center gap-1.5 sm:gap-2 transition-all ${
                    view === 'chat' 
                      ? 'bg-white/15 border-b-2 border-white' 
                      : 'hover:bg-white/5 border-b-2 border-transparent'
                  }`}
                >
                  <MessageSquare size={14} className="sm:w-4 sm:h-4" />
                  <span>שיחה</span>
                </button>
                <button
                  onClick={() => setView('history')}
                  className={`flex-1 px-2 py-2.5 sm:px-4 sm:py-3 text-xs sm:text-[13px] font-bold flex items-center justify-center gap-1.5 sm:gap-2 transition-all ${
                    view === 'history' 
                      ? 'bg-white/15 border-b-2 border-white' 
                      : 'hover:bg-white/5 border-b-2 border-transparent'
                  }`}
                >
                  <Clock size={14} className="sm:w-4 sm:h-4" />
                  <span>היסטוריה</span>
                </button>
                <button
                  onClick={() => setView('help')}
                  className={`flex-1 px-2 py-2.5 sm:px-4 sm:py-3 text-xs sm:text-[13px] font-bold flex items-center justify-center gap-1.5 sm:gap-2 transition-all ${
                    view === 'help' 
                      ? 'bg-white/15 border-b-2 border-white' 
                      : 'hover:bg-white/5 border-b-2 border-transparent'
                  }`}
                >
                  <CircleHelp size={14} className="sm:w-4 sm:h-4" />
                  <span>עזרה</span>
                </button>
              </div>
            </div>

            {/* Feedback Form */}
            {showFeedback && (
              <div className="p-6 bg-white border-b border-slate-200">
                <h3 className="text-[17px] font-bold text-slate-900 mb-3">איך הייתה השיחה?</h3>
                
                {/* דירוג כוכבים */}
                <div className="mb-4">
                  <p className="text-[14px] text-slate-600 mb-2">דרגי את השיחה:</p>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setFeedbackRating(star)}
                        className="text-3xl transition-transform hover:scale-110"
                      >
                        {star <= feedbackRating ? '⭐' : '☆'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* האם עזר */}
                <div className="mb-4">
                  <p className="text-[14px] text-slate-600 mb-2">האם {personaName} עזרה לך?</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setFeedbackHelpful(true)}
                      className={`px-4 py-2 rounded-xl text-[14px] font-bold transition-all ${
                        feedbackHelpful === true
                          ? 'bg-green-600 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      👍 כן, עזרה
                    </button>
                    <button
                      onClick={() => setFeedbackHelpful(false)}
                      className={`px-4 py-2 rounded-xl text-[14px] font-bold transition-all ${
                        feedbackHelpful === false
                          ? 'bg-red-600 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      👎 לא ממש
                    </button>
                  </div>
                </div>

                {/* תיבת טקסט */}
                <div className="mb-4">
                  <p className="text-[14px] text-slate-600 mb-2">רוצה לשתף משהו? (אופציונלי)</p>
                  <textarea
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    placeholder="מה היה טוב? מה אפשר לשפר?"
                    className="w-full h-24 rounded-2xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-[14px] outline-none focus:border-slate-400 resize-none"
                  />
                </div>

                {/* כפתורים */}
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      // שמירת feedback
                      if (currentChatId) {
                        try {
                          await fetch('/api/ai/feedback', {
                            method: 'POST',
                            headers: { 'content-type': 'application/json' },
                            body: JSON.stringify({
                              sessionId: currentChatId,
                              rating: feedbackRating,
                              helpful: feedbackHelpful,
                              feedback: feedbackText,
                            }),
                          });
                        } catch (e) {
                          console.error('Failed to save feedback:', e);
                        }
                      }
                      
                      // איפוס
                      setMessages([]);
                      setShowFeedback(false);
                      setFeedbackRating(0);
                      setFeedbackText('');
                      setFeedbackHelpful(null);
                      setCurrentChatId(null);
                    }}
                    className="flex-1 px-4 py-3 rounded-2xl bg-gradient-to-br from-green-500 to-green-600 text-white text-[14px] font-bold hover:from-green-600 hover:to-green-700 transition-all"
                  >
                    שלח ותודה! 💚
                  </button>
                  <button
                    onClick={() => {
                      setMessages([]);
                      setShowFeedback(false);
                      setFeedbackRating(0);
                      setFeedbackText('');
                      setFeedbackHelpful(null);
                      setCurrentChatId(null);
                    }}
                    className="px-4 py-3 rounded-2xl bg-slate-100 text-slate-700 text-[14px] font-bold hover:bg-slate-200 transition-all"
                  >
                    דלג
                  </button>
                </div>
              </div>
            )}

            {/* Content Area */}
            <div className="flex-1 overflow-hidden flex flex-col bg-slate-50">
              {view === 'chat' && (
                <>
                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto px-3 py-3 sm:px-4 sm:py-4">
                    {messages.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center px-3 sm:px-6">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center mb-3 sm:mb-4">
                          <Sparkles size={28} className="sm:w-9 sm:h-9 text-slate-600" />
                        </div>
                        <h3 className="text-base sm:text-[17px] font-bold text-slate-900 mb-2">
                          {isSales ? 'שלום! איך אפשר לעזור?' : 'העוזר החכם שלך כאן'}
                        </h3>
                        <p className="text-[13px] sm:text-[14px] text-slate-600 mb-4 sm:mb-6 leading-relaxed">
                          {isSales 
                            ? 'שאל אותי על תוכניות, מחירים או תהליך ההצטרפות'
                            : 'שאל אותי כל שאלה על השימוש במערכת'}
                        </p>
                        
                        {/* Quick Start Actions */}
                        <div className="w-full space-y-2">
                          {quickActionsToShow.slice(0, 4).map((action, idx) => (
                            <button
                              key={idx}
                              onClick={() => sendText(action)}
                              className="w-full px-4 py-3 sm:px-5 sm:py-3.5 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl sm:rounded-2xl text-[13px] sm:text-[14px] font-semibold text-slate-700 hover:text-slate-900 transition-all text-right flex items-center justify-between group"
                            >
                              <span>{action}</span>
                              <Sparkles size={14} className="sm:w-4 sm:h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {messages.map((m) => {
                          const text = extractText(m);
                          const isUser = m.role === 'user';
                          const id = String(m.id);
                          const typed = typedById[id] ?? '';
                          const isTyping = !isUser && typed.length < text.length;
                          const displayText = isTyping ? typed : text;
                          
                          return (
                            <div key={id} className="space-y-2">
                              <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                                <div
                                  className={`${isUser ? 'max-w-[85%]' : 'w-full'} rounded-2xl sm:rounded-3xl px-4 py-3 sm:px-6 sm:py-5 shadow-sm text-[14px] sm:text-[16px] leading-relaxed ${
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
                                        className="[&_p]:first:mt-0 [&_p]:last:mb-0 [&_p]:text-[16px] [&_p]:leading-relaxed"
                                      />
                                      {isTyping && <span className="opacity-70 ml-1">▍</span>}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Quick Actions */}
                              {!isUser && m.quickActions && m.quickActions.length > 0 && !isTyping && (
                                <div className="flex gap-1.5 sm:gap-2 flex-wrap pr-1 sm:pr-2">
                                  {m.quickActions.map((action, idx) => (
                                    <button
                                      key={idx}
                                      onClick={() => sendText(action)}
                                      className="px-3 py-1.5 sm:px-4 sm:py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 hover:border-slate-300 rounded-full text-xs sm:text-[13px] font-semibold text-slate-700 hover:text-slate-900 transition-all flex items-center gap-1.5 sm:gap-2"
                                    >
                                      <Zap size={12} className="sm:w-3.5 sm:h-3.5 text-slate-500" />
                                      {action}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {isLoading && (
                          <div className="flex justify-start">
                            <div className="w-full rounded-3xl px-6 py-5 border border-slate-200 bg-white text-[15px] font-semibold text-slate-500 shadow-sm">
                              <div className="flex items-center gap-2">
                                <div className="flex gap-1">
                                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                </div>
                                <span className="text-[14px]">מכין תשובה...</span>
                              </div>
                            </div>
                          </div>
                        )}

                        <div ref={endRef} />
                      </div>
                    )}
                  </div>

                  {/* Input Area */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void sendText(input);
                    }}
                    className="p-3 sm:p-4 bg-white border-t border-slate-200 flex items-center gap-2 sm:gap-3"
                  >
                    <input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder={isSales ? 'שאל על מחירים...' : 'איך לבצע פעולה...'}
                      className="flex-1 h-11 sm:h-14 rounded-xl sm:rounded-2xl border-2 border-slate-200 bg-slate-50 px-4 sm:px-5 text-sm sm:text-[15px] font-medium outline-none focus:outline-none focus:border-slate-400 focus:bg-white transition-all placeholder:text-slate-400"
                      style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
                      disabled={isLoading}
                    />
                    <button
                      type="submit"
                      disabled={isLoading || !String(input || '').trim()}
                      className="h-11 w-11 sm:h-14 sm:w-14 rounded-xl sm:rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:from-amber-500 hover:to-orange-600 hover:shadow-xl hover:shadow-orange-500/20 active:scale-95 transition-all focus:outline-none shadow-lg"
                      aria-label="שלח"
                    >
                      <ArrowUp size={18} className="sm:w-[22px] sm:h-[22px]" strokeWidth={3} />
                    </button>
                  </form>
                  {error && <div className="px-5 pb-4 text-[13px] font-bold text-rose-600 bg-white">{error}</div>}
                </>
              )}

              {view === 'history' && (
                <div className="flex-1 overflow-y-auto p-4">
                  <div className="mb-4">
                    <h3 className="text-[18px] font-bold text-slate-900 mb-3">היסטוריית שיחות</h3>
                    {chatHistory.length === 0 ? (
                      <div className="text-center py-12">
                        <Clock size={48} className="text-slate-300 mx-auto mb-3" />
                        <p className="text-[14px] text-slate-500">עדיין אין היסטוריה</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {chatHistory.map((chat) => (
                          <button
                            key={chat.id}
                            onClick={() => {
                              setCurrentChatId(chat.id);
                              setMessages(chat.messages);
                              setView('chat');
                            }}
                            className="w-full p-4 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-2xl text-right transition-all group"
                          >
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <h4 className="text-[15px] font-bold text-slate-900 line-clamp-1">{chat.title}</h4>
                              <span className="text-[12px] text-slate-500 whitespace-nowrap">
                                {new Date(chat.timestamp).toLocaleDateString('he-IL')}
                              </span>
                            </div>
                            <p className="text-[13px] text-slate-600 line-clamp-2 leading-relaxed">{chat.preview}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <MessageSquare size={14} className="text-slate-400" />
                              <span className="text-[12px] text-slate-500">{chat.messages.length} הודעות</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {view === 'help' && (
                <div className="flex-1 overflow-y-auto p-4">
                  <div className="mb-4">
                    <h3 className="text-[18px] font-bold text-slate-900 mb-3">מרכז עזרה</h3>
                    
                    {/* Search */}
                    <div className="relative mb-4">
                      <Search size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10" />
                      <input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="חפש מאמר עזרה..."
                        className="w-full h-12 rounded-2xl border-2 border-slate-200 bg-slate-50 pr-12 pl-4 text-[14px] font-medium outline-none focus:outline-none focus:border-slate-400 focus:bg-white transition-all"
                      />
                    </div>

                    {/* Knowledge Base */}
                    {filteredKnowledge.length === 0 ? (
                      <div className="text-center py-8">
                        <FileText size={40} className="text-slate-300 mx-auto mb-3" />
                        <p className="text-[14px] text-slate-500">לא נמצאו תוצאות</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {filteredKnowledge.map((item) => (
                          <div
                            key={item.id}
                            className="p-4 bg-white border border-slate-200 rounded-2xl"
                          >
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <h4 className="text-[15px] font-bold text-slate-900">{item.title}</h4>
                              <span className="text-[11px] px-2 py-1 bg-slate-100 text-slate-600 rounded-full font-semibold whitespace-nowrap">
                                {item.category}
                              </span>
                            </div>
                            <p className="text-[14px] text-slate-700 leading-relaxed">{item.content}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
