'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, ArrowRight, Sparkles, ArrowUp, Loader2 } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { isOSModuleKey } from '@/lib/os/modules/registry';
import type { OSModuleKey } from '@/lib/os/modules/types';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import { useBackButtonClose } from '@/hooks/useBackButtonClose';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

type SearchMode = 'search' | 'chat';

const MODULE_LABELS: Record<string, string> = {
  nexus: 'Nexus',
  system: 'System',
  social: 'Social',
  finance: 'Finance',
  client: 'Client',
  operations: 'Operations',
};

const MODULE_COLORS: Record<string, string> = {
  nexus: '#3730A3',
  system: '#A21D3C',
  social: '#7C3AED',
  finance: '#059669',
  client: '#C5A572',
  operations: '#0EA5E9',
};

function detectModuleFromPathname(pathname: string): OSModuleKey | null {
  const match = pathname.match(/^\/w\/[^/]+\/([^/?#]+)/);
  if (!match) return null;
  const mod = match[1];
  return isOSModuleKey(mod) ? mod : null;
}

function makeId() {
  return `msg_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function GlobalSearchModal() {
  const [isOpen, setIsOpen] = useState(false);
  useBackButtonClose(isOpen, () => setIsOpen(false));
  const [mode, setMode] = useState<SearchMode>('search');
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  
  const currentModule = useMemo(() => detectModuleFromPathname(pathname || '/'), [pathname]);
  const moduleLabel = currentModule ? MODULE_LABELS[currentModule] || currentModule : 'כללי';
  const moduleColor = currentModule ? MODULE_COLORS[currentModule] || '#3730A3' : '#3730A3';

  // Reset chat when module changes
  useEffect(() => {
    setMessages([]);
  }, [currentModule]);

  useEffect(() => {
    const handler = () => {
      setIsOpen(true);
      setQuery('');
      setMode('search');
    };
    window.addEventListener('os:open-search', handler);

    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsOpen((v) => {
          if (!v) {
            setQuery('');
            setMode('search');
          }
          return !v;
        });
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', keyHandler);

    return () => {
      window.removeEventListener('os:open-search', handler);
      window.removeEventListener('keydown', keyHandler);
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        if (mode === 'search') {
          inputRef.current?.focus();
        } else {
          textareaRef.current?.focus();
        }
      }, 100);
    }
  }, [isOpen, mode]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setQuery('');
  }, []);

  const handleNavigate = useCallback(
    (path: string) => {
      router.push(path);
      handleClose();
    },
    [router, handleClose]
  );

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;

      const userMsg: ChatMessage = {
        id: makeId(),
        role: 'user',
        content: text.trim(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setQuery('');
      setIsLoading(true);

      try {
        const orgMatch = (pathname || '').match(/^\/w\/([^/]+)/);
        const orgSlug = orgMatch ? orgMatch[1] : null;

        const res = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(orgSlug ? { 'x-org-id': encodeURIComponent(orgSlug) } : {}),
          },
          body: JSON.stringify({
            featureKey: 'ai.chat',
            module: currentModule || 'global',
            orgId: orgSlug,
            messages: [...messages, userMsg].map((m) => ({ role: m.role, content: m.content })),
          }),
        });

        if (!res.ok) {
          throw new Error('שגיאה בתקשורת');
        }

        const data = await res.json();
        const reply = typeof data?.text === 'string' ? data.text : 'מצטער, לא הצלחתי לעבד את הבקשה.';

        const assistantMsg: ChatMessage = {
          id: makeId(),
          role: 'assistant',
          content: reply,
        };

        setMessages((prev) => [...prev, assistantMsg]);
      } catch {
        const errorMsg: ChatMessage = {
          id: makeId(),
          role: 'assistant',
          content: 'מצטער, יש בעיה זמנית. נסה שוב בעוד רגע.',
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setIsLoading(false);
      }
    },
    [currentModule, isLoading, messages, pathname]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (mode === 'chat') {
        sendMessage(query);
      }
    }
  };

  const getQuickLinks = (): { label: string; path: string; section: string }[] => {
    if (typeof window === 'undefined') return [];
    const currentPathname = window.location.pathname;

    const match = currentPathname.match(/^\/w\/([^/]+)\/([^/]*)/);
    if (!match) return [];
    const [, orgSlug] = match;
    const base = `/w/${orgSlug}`;

    const links: { label: string; path: string; section: string }[] = [];

    links.push(
      { label: 'Nexus — דשבורד', path: `${base}/nexus`, section: 'ניווט מהיר' },
      { label: 'Nexus — משימות', path: `${base}/nexus/tasks`, section: 'ניווט מהיר' },
      { label: 'Nexus — לקוחות', path: `${base}/nexus/clients`, section: 'ניווט מהיר' },
      { label: 'Operations — דשבורד', path: `${base}/operations`, section: 'ניווט מהיר' },
      { label: 'Operations — קריאות שירות', path: `${base}/operations/work-orders`, section: 'ניווט מהיר' },
      { label: 'Operations — פרויקטים', path: `${base}/operations/projects`, section: 'ניווט מהיר' },
      { label: 'System — לידים', path: `${base}/system/sales_pipeline`, section: 'ניווט מהיר' },
      { label: 'Social — דשבורד', path: `${base}/social/dashboard`, section: 'ניווט מהיר' },
      { label: 'Finance — דשבורד', path: `${base}/finance`, section: 'ניווט מהיר' },
      { label: 'Client — דשבורד', path: `${base}/client`, section: 'ניווט מהיר' },
    );

    return links;
  };

  const filteredLinks = getQuickLinks().filter((link) => {
    if (!query.trim()) return true;
    return link.label.toLowerCase().includes(query.toLowerCase());
  });

  return (
    <AnimatePresence>
      {isOpen ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9000]"
            onClick={handleClose}
          />
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.98 }}
            className={`fixed top-[6vh] left-1/2 -translate-x-1/2 w-[calc(100%-1.5rem)] sm:w-full z-[9001] bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200/60 overflow-hidden flex flex-col ${
              mode === 'chat' ? 'max-w-2xl max-h-[75vh]' : 'max-w-lg'
            }`}
            dir="rtl"
          >
            {/* Mode Tabs */}
            <div className="flex items-center gap-1 p-2 border-b border-slate-100 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setMode('search')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  mode === 'search'
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
                }`}
              >
                <Search size={16} />
                חיפוש
              </button>
              <button
                type="button"
                onClick={() => setMode('chat')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  mode === 'chat'
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
                }`}
              >
                <Sparkles size={16} />
                צ'אט AI
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: moduleColor }}
                />
              </button>
              <button
                onClick={handleClose}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-white transition-colors"
                type="button"
              >
                <X size={16} />
              </button>
            </div>

            {mode === 'search' ? (
              /* Search Mode */
              <>
                <div className="flex items-center gap-3 p-4 border-b border-slate-100">
                  <Search size={20} className="text-slate-400 shrink-0" />
                  <input
                    ref={inputRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="flex-1 text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none bg-transparent"
                    placeholder="חפש דף, פעולה או מודול..."
                    autoComplete="off"
                  />
                </div>

                <div className="max-h-80 overflow-y-auto p-2">
                  {filteredLinks.length === 0 ? (
                    <div className="p-6 text-center text-sm text-slate-400">לא נמצאו תוצאות</div>
                  ) : (
                    filteredLinks.slice(0, 12).map((link) => (
                      <button
                        key={link.path}
                        type="button"
                        onClick={() => handleNavigate(link.path)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors text-right"
                      >
                        <ArrowRight size={14} className="text-slate-300 shrink-0" />
                        <span className="flex-1 truncate">{link.label}</span>
                      </button>
                    ))
                  )}
                </div>

                <div className="p-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-[10px] text-slate-400 font-bold">
                  <span>⌘K לפתיחה/סגירה</span>
                  <span>ESC לסגירה</span>
                </div>
              </>
            ) : (
              /* Chat Mode */
              <>
                <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-100 bg-slate-50/30">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: moduleColor }}
                  />
                  <span className="text-xs font-bold text-slate-500">
                    מידע מבודד למודול {moduleLabel} בלבד
                  </span>
                </div>

                <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px] max-h-[400px]">
                  {messages.length === 0 ? (
                    <div className="text-center py-8">
                      <div
                        className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center text-white shadow-lg"
                        style={{ backgroundColor: moduleColor }}
                      >
                        <Sparkles size={24} />
                      </div>
                      <h4 className="text-base font-black text-slate-900 mb-1">שלום! אני העוזר שלך</h4>
                      <p className="text-xs text-slate-500">
                        שאל אותי כל שאלה על {moduleLabel}
                      </p>
                    </div>
                  ) : (
                    messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                            msg.role === 'user'
                              ? 'bg-slate-900 text-white rounded-tr-md'
                              : 'bg-slate-100 text-slate-900 rounded-tl-md'
                          }`}
                        >
                          {msg.role === 'assistant' ? (
                            <MarkdownRenderer content={msg.content} />
                          ) : (
                            <span className="whitespace-pre-wrap">{msg.content}</span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                  {isLoading ? (
                    <div className="flex justify-end">
                      <div className="bg-slate-100 rounded-2xl rounded-tl-md px-4 py-3 flex items-center gap-2">
                        <Loader2 size={14} className="animate-spin text-slate-400" />
                        <span className="text-xs text-slate-400 font-bold">חושב...</span>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="p-3 border-t border-slate-100">
                  <div className="flex items-end gap-2 bg-slate-50 rounded-2xl px-3 py-2 border border-slate-200 focus-within:border-slate-400 transition-colors">
                    <textarea
                      ref={textareaRef}
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={handleKeyDown}
                      rows={1}
                      className="flex-1 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 outline-none resize-none max-h-24"
                      placeholder="שאל אותי כל שאלה..."
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => sendMessage(query)}
                      disabled={!query.trim() || isLoading}
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-white transition-colors shrink-0 disabled:opacity-40"
                      style={{ backgroundColor: query.trim() && !isLoading ? moduleColor : '#94a3b8' }}
                    >
                      <ArrowUp size={16} />
                    </button>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
