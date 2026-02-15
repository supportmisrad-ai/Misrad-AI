'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Sparkles } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { parseWorkspaceRoute } from '@/lib/os/social-routing';
import { useAIModuleChat } from '@/components/command-palette/useAIModuleChat';
import { ChatSources } from '@/components/command-palette/ChatSources';
import { getSemanticStarters } from '@/components/command-palette/semanticStarters';

export default function CommandPalette({
  isOpen,
  onCloseAction,
  onNavigateAction,
  navItems,
}: {
  isOpen: boolean;
  onCloseAction: () => void;
  onNavigateAction: (tabId: string) => void;
  navItems: Array<{ id: string; label: string }>;
}) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const pathname = usePathname();
  const orgSlug = useMemo(() => parseWorkspaceRoute(pathname).orgSlug, [pathname]);

  const { messages, isLoading: isThinking, error, sendText, clear } = useAIModuleChat({
    moduleOverride: 'finance',
    orgSlugOverride: orgSlug,
  });

  const lastAssistant = useMemo(() => {
    const list = Array.isArray(messages) ? messages : [];
    return [...list].reverse().find((m) => m.role === 'assistant') || null;
  }, [messages]);

  const aiResponse = lastAssistant
    ? {
        type: error ? 'error' : 'success',
        text: String(lastAssistant.content || ''),
        sources: Array.isArray(lastAssistant.sources) ? lastAssistant.sources : [],
      }
    : null;

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      clear();
    }
  }, [isOpen, clear]);

  if (!isOpen) return null;

  const filteredNav = (Array.isArray(navItems) ? navItems : [])
    .filter((item) => item.label.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 8);

  return (
    <div
      className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-start justify-center pt-[12vh] transition-all duration-200"
      onClick={onCloseAction}
    >
      <div
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden ring-1 ring-white/20 animate-scale-in transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-4 p-5 border-b border-slate-100 bg-white relative">
          <Search
            className={`transition-colors ${isThinking ? 'text-emerald-600 animate-pulse' : 'text-slate-400'}`}
            size={24}
          />
          <input
            ref={inputRef}
            type="text"
            placeholder="שאל את Nexus על כספים או חפש..."
            className="flex-1 bg-transparent text-xl focus:outline-none text-slate-800 placeholder:text-slate-300 font-medium h-10"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                onCloseAction();
              }
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (query.trim()) {
                  sendText(query);
                  setQuery('');
                }
              }
            }}
          />
          <div className="hidden md:flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-lg text-[10px] font-bold text-slate-500 uppercase border border-slate-200">
            <span className="text-xs">ESC</span>
          </div>
        </div>

        <div className="max-h-[60vh] overflow-y-auto custom-scrollbar p-2 bg-slate-50/50">
          <div className="px-2 pt-2">
            <div className="flex flex-wrap gap-2">
              {getSemanticStarters('finance').map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    sendText(s.text);
                    setQuery('');
                  }}
                  disabled={isThinking}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl bg-white/80 border border-slate-200/60 text-slate-700 text-xs font-bold hover:bg-white hover:border-emerald-200/60 hover:text-slate-900 transition-all"
                >
                  <Sparkles size={14} className="text-emerald-600" />
                  {s.text}
                </button>
              ))}
            </div>
          </div>

          {aiResponse && (
            <div className="mb-4 mx-2 mt-2 animate-slide-down">
              <div className="bg-slate-900 rounded-xl p-4 text-white shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/20 rounded-full blur-2xl"></div>
                <div className="relative z-10 flex gap-3">
                  <div className="p-2 bg-emerald-600 rounded-lg h-fit shadow-md shadow-emerald-900/20">
                    <Sparkles size={18} className="text-yellow-300" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider mb-1">Nexus Intelligence</div>
                    <div className="text-sm font-medium leading-relaxed">{aiResponse.text}</div>
                    {Array.isArray(aiResponse.sources) && aiResponse.sources.length ? (
                      <ChatSources sources={aiResponse.sources} />
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          )}

          {filteredNav.length > 0 && (
            <div className="mb-2">
              <div className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">ניווט מהיר</div>
              <div className="space-y-1">
                {filteredNav.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      onNavigateAction(item.id);
                      onCloseAction();
                    }}
                    className="w-full text-right px-4 py-3 rounded-xl hover:bg-white hover:shadow-sm hover:ring-1 hover:ring-slate-200 flex items-center justify-between transition-all"
                  >
                    <span className="font-bold text-slate-700">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {query === '' && !aiResponse && !isThinking && (
            <div className="p-12 text-center text-slate-400 opacity-60">
              <p className="text-sm font-medium">מה תרצה לעשות עכשיו?</p>
              <p className="text-xs mt-1">שאל שאלה פיננסית או נווט למסך.</p>
            </div>
          )}
        </div>

        <div className="p-3 bg-white border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400 px-6">
          <div className="flex items-center gap-1 text-emerald-500 font-bold">
            <Sparkles size={10} /> Nexus AI Active
          </div>
        </div>
      </div>
    </div>
  );
}
