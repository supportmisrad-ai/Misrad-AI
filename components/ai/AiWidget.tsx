'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Maximize2, MessageCircle, Minimize2, Send, X } from 'lucide-react';
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
            ...(orgSlug ? { 'x-org-id': orgSlug } : {}),
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
        <div className={`${panelSize} rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden flex flex-col`}>
          <div className="h-12 flex items-center justify-between px-3 border-b border-slate-200 bg-slate-50">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                <MessageCircle size={16} />
              </div>
              <div className="text-sm font-black text-slate-900">{title}</div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsMedium((v) => !v)}
                className="h-8 w-8 rounded-xl hover:bg-slate-200 flex items-center justify-center"
                aria-label={isMedium ? 'הקטן חלון' : 'הרחב חלון'}
              >
                {isMedium ? <Minimize2 size={18} className="text-slate-700" /> : <Maximize2 size={18} className="text-slate-700" />}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="h-8 w-8 rounded-xl hover:bg-slate-200 flex items-center justify-center"
                aria-label="סגור"
              >
                <X size={18} className="text-slate-700" />
              </button>
            </div>
          </div>

          <div ref={listRef} className="flex-1 overflow-y-auto p-3 bg-white">
            {messages.length === 0 ? (
              <div className="text-sm text-slate-600 leading-relaxed">
                {marketing
                  ? 'שלום! רוצה שאעזור לך לבחור חבילה ולראות אם זה מתאים לך?'
                  : 'שלום! איך אפשר לעזור לך לבצע פעולה במערכת?'}
              </div>
            ) : null}

            <div className="mt-3 flex flex-col gap-2">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={
                    m.role === 'user'
                      ? 'self-start max-w-[88%] rounded-2xl bg-slate-900 text-white px-3 py-2 text-[15px] leading-7 font-medium whitespace-pre-wrap'
                      : 'self-end max-w-[88%] rounded-2xl bg-slate-100 text-slate-900 px-3 py-2 text-[15px] leading-7 font-medium'
                  }
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
                      className="text-[15px] leading-7 font-medium [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_h1]:mt-2 [&_h2]:mt-2 [&_h3]:mt-2"
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
            className="p-3 border-t border-slate-200 bg-white"
          >
            <div className="flex items-end gap-2">
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
                placeholder={marketing ? 'כתוב הודעה...' : 'איך אפשר לעזור?'}
                className="flex-1 resize-none rounded-2xl border border-slate-200 px-3 py-2 text-[15px] font-semibold focus:outline-none focus:ring-2 focus:ring-slate-300"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="h-10 w-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center disabled:opacity-50"
                aria-label="שלח"
              >
                <Send size={16} />
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
          className="h-14 w-14 rounded-2xl bg-slate-900 text-white shadow-2xl flex items-center justify-center hover:bg-slate-800 transition-colors"
          aria-label="צ'אט AI"
        >
          <MessageCircle size={22} />
        </button>
      )}
    </div>
  );
}
