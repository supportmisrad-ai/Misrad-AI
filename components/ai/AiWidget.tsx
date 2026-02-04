'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Maximize2, MessageCircle, Minimize2, X, Bot, Sparkles, ArrowUp } from 'lucide-react';
import { parseWorkspaceRoute } from '@/lib/os/social-routing';
import MarkdownRenderer from '@/components/MarkdownRenderer';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

function makeId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function isMarketingPathname(pathname: string): boolean {
  const p = String(pathname || '').trim() || '/';
  if (p.startsWith('/w/')) return false;
  if (p.startsWith('/app')) return false;
  if (p.startsWith('/api')) return false;
  return true;
}

export function AiWidget() {
  const pathname = usePathname() || '/';
  const routeInfo = useMemo(() => parseWorkspaceRoute(pathname), [pathname]);

  const orgSlug = routeInfo.orgSlug;
  const moduleKey = routeInfo.module;

  const marketing = useMemo(() => isMarketingPathname(pathname), [pathname]);

  const [open, setOpen] = useState(false);
  const [isMedium, setIsMedium] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNudge, setShowNudge] = useState(false);

  const [typedById, setTypedById] = useState<Record<string, string>>({});
  const typedByIdRef = useRef<Record<string, string>>({});
  const typingIntervalRef = useRef<any>(null);

  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    typedByIdRef.current = typedById;
  }, [typedById]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length, isLoading]);

  useEffect(() => {
    const assistantMsgs = messages.filter((m) => m && m.role === 'assistant');
    if (!assistantMsgs.length) return;

    const pending = assistantMsgs.find((m) => {
      const current = typedByIdRef.current[m.id] ?? '';
      return current.length < String(m.content || '').length;
    });

    if (!pending) return;

    const id = pending.id;
    const full = String(pending.content || '');

    if (typingIntervalRef.current) {
      clearInterval(typingIntervalRef.current);
      typingIntervalRef.current = null;
    }

    const step = 2;
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

      const el = listRef.current;
      if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'auto' });
    }, 20);

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
    if (!marketing) return;
    if (open) return;
    if (messages.length > 0) return;

    const t = setTimeout(() => {
      setShowNudge(true);
    }, 10000);

    return () => clearTimeout(t);
  }, [marketing, open, messages.length]);

  useEffect(() => {
    if (!marketing) {
      setShowNudge(false);
      return;
    }
  }, [marketing]);

  const sendText = useCallback(
    async (text: string) => {
      const trimmed = String(text || '').trim();
      if (!trimmed) return;
      if (isLoading) return;

      setError(null);
      setShowNudge(false);

      const userMsg: ChatMessage = { id: makeId('user'), role: 'user', content: trimmed };
      const nextMessages = [...messages, userMsg];

      setMessages(nextMessages);
      setInput('');
      setIsLoading(true);

      try {
        const res = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            ...(orgSlug ? { 'x-org-id': encodeURIComponent(String(orgSlug)) } : {}),
          },
          body: JSON.stringify({
            featureKey: 'ai.chat',
            module: moduleKey || 'global',
            orgId: orgSlug,
            pathname,
            messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
          }),
        });

        const data = (await res.json().catch(() => ({}))) as any;
        if (!res.ok) {
          throw new Error(String(data?.error || `Chat failed (${res.status})`));
        }

        const assistantMsg: ChatMessage = {
          id: makeId('assistant'),
          role: 'assistant',
          content: String(data?.text || ''),
        };

        setMessages((prev) => [...prev, assistantMsg]);
      } catch (e: any) {
        setError(String(e?.message || 'שגיאה בשליחת ההודעה'));
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, messages, moduleKey, orgSlug, pathname]
  );

  const title = marketing ? 'יועץ מכירות' : 'שרה מהתמיכה';
  const panelSize = isMedium
    ? 'w-[min(560px,calc(100vw-2rem))] h-[min(680px,calc(100vh-6rem))] max-h-[82vh]'
    : 'w-[360px] max-w-[calc(100vw-2rem)] h-[520px] max-h-[70vh]';

  return (
    <div className="fixed bottom-4 right-4 z-[460]">
      {showNudge && !open ? (
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            setShowNudge(false);
            setMessages((prev) =>
              prev.length
                ? prev
                : [
                    {
                      id: makeId('assistant'),
                      role: 'assistant',
                      content: 'מתלבט? בוא נראה איך המערכת מחזירה את ההשקעה תוך שבוע.',
                    },
                  ]
            );
          }}
          className="mb-3 w-[320px] max-w-[calc(100vw-2rem)] text-right rounded-2xl bg-white border border-slate-200 shadow-2xl px-4 py-3"
        >
          <div className="text-sm font-black text-slate-900">{title}</div>
          <div className="mt-1 text-sm text-slate-700">מתלבט? בוא נראה איך המערכת מחזירה את ההשקעה תוך שבוע.</div>
          <div className="mt-2 text-xs font-bold text-slate-500">לחץ לפתיחה</div>
        </button>
      ) : null}

      {open ? (
        <div className={`${panelSize} rounded-3xl bg-white border border-slate-200 shadow-[0_25px_60px_-12px_rgba(0,0,0,0.25)] overflow-hidden flex flex-col`}>
          <div className="h-14 flex items-center justify-between px-4 border-b border-slate-100 bg-gradient-to-r from-indigo-50 via-white to-purple-50">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center">
                <Bot size={20} />
              </div>
              <div>
                <div className="text-sm font-black text-slate-900">MISRAD AI</div>
                <div className="text-[10px] font-bold text-slate-500">{title}</div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsMedium((v) => !v)}
                className="h-8 w-8 rounded-xl hover:bg-white/80 flex items-center justify-center transition-colors"
                aria-label={isMedium ? 'הקטן חלון' : 'הרחב חלון'}
              >
                {isMedium ? <Minimize2 size={18} className="text-slate-600" /> : <Maximize2 size={18} className="text-slate-600" />}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="h-8 w-8 rounded-xl hover:bg-white/80 flex items-center justify-center transition-colors"
                aria-label="סגור"
              >
                <X size={18} className="text-slate-600" />
              </button>
            </div>
          </div>

          <div ref={listRef} className="flex-1 overflow-y-auto p-3 bg-white">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 px-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/20">
                  <Bot size={32} className="text-white" />
                </div>
                <div className="text-lg font-black text-slate-900 mb-1">שלום! 👋</div>
                <div className="text-sm text-slate-500 text-center mb-6">
                  {marketing
                    ? 'איך אפשר לעזור לך לבחור את החבילה המתאימה?'
                    : 'איך אפשר לעזור לך היום?'}
                </div>
                <div className="w-full space-y-2">
                  <button
                    type="button"
                    onClick={() => void sendText(marketing ? 'מה ההבדל בין החבילות?' : 'איך מוסיפים לקוח חדש?')}
                    className="w-full text-right px-4 py-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-sm font-semibold text-slate-700 transition-colors"
                  >
                    {marketing ? '💎 מה ההבדל בין החבילות?' : '➕ איך מוסיפים לקוח חדש?'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void sendText(marketing ? 'כמה עולה המערכת?' : 'איך יוצרים משימה?')}
                    className="w-full text-right px-4 py-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-sm font-semibold text-slate-700 transition-colors"
                  >
                    {marketing ? '💰 כמה עולה המערכת?' : '✅ איך יוצרים משימה?'}
                  </button>
                </div>
              </div>
            ) : null}

            <div className="mt-3 flex flex-col gap-2">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={
                    m.role === 'user'
                      ? 'self-start max-w-[85%] rounded-2xl bg-slate-900 text-white px-6 py-4 text-base leading-relaxed font-medium whitespace-pre-wrap shadow-md'
                      : 'self-end max-w-[85%] rounded-2xl bg-white text-slate-900 border border-slate-200 px-6 py-4 text-base leading-relaxed shadow-md'
                  }
                  style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
                >
                  {m.role === 'user' ? (
                    m.content
                  ) : (typedById[m.id] ?? '').length < String(m.content || '').length ? (
                    <div dir="rtl" className="whitespace-pre-wrap text-right [unicode-bidi:plaintext]">
                      {typedById[m.id] ?? ''}
                      <span className="opacity-70">▍</span>
                    </div>
                  ) : (
                    <MarkdownRenderer
                      content={m.content}
                      className="[&_p]:first:mt-0 [&_p]:last:mb-0"
                    />
                  )}
                </div>
              ))}

              {isLoading ? <div className="self-end text-xs font-bold text-slate-500">מקליד...</div> : null}
              {error ? <div className="text-xs font-bold text-red-600">{error}</div> : null}
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void sendText(input);
            }}
            className="p-4 border-t border-slate-100 bg-gradient-to-r from-slate-50/50 to-white"
          >
            <div className="flex items-end gap-3">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void sendText(input);
                  }
                }}
                rows={1}
                dir="rtl"
                placeholder={marketing ? 'שאל אותי איך לבצע פעולה במערכת...' : 'איך אפשר לעזור?'}
                className="flex-1 resize-none rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 text-[15px] font-medium focus:outline-none focus:border-blue-500 transition-colors"
                style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="h-12 w-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center hover:from-amber-500 hover:to-orange-600 hover:shadow-xl hover:shadow-orange-500/30 active:scale-95 disabled:opacity-50 transition-all focus:outline-none shadow-lg"
                aria-label="שלח"
              >
                <ArrowUp size={20} strokeWidth={3} />
              </button>
            </div>
          </form>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            setShowNudge(false);
          }}
          className="group h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-xl shadow-indigo-500/30 flex items-center justify-center hover:shadow-indigo-500/40 hover:scale-105 transition-all duration-200"
          aria-label="צ'אט AI"
        >
          <Bot size={24} className="group-hover:scale-110 transition-transform" />
        </button>
      )}
    </div>
  );
}
