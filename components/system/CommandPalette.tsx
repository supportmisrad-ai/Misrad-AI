'use client';

import React, { useMemo, useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, ArrowRight, User, LayoutGrid, Sparkles, Link, Copy, Send } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { Lead } from './types';
import { NAV_ITEMS, QUICK_ASSETS } from './constants';
import { useToast } from './contexts/ToastContext';
import { parseWorkspaceRoute } from '@/lib/os/social-routing';
import { useAIModuleChat } from '@/components/command-palette/useAIModuleChat';
import { getSemanticStarters } from '@/components/command-palette/semanticStarters';
import { CommandPaletteHeader } from '@/components/command-palette/CommandPaletteHeader';
import { CommandPaletteChat } from '@/components/command-palette/CommandPaletteChat';
import type { CommandPaletteMode } from '@/components/command-palette/command-palette.types';
import { getModuleDefinition } from '@/lib/os/modules/registry';
import { asObject } from '@/lib/shared/unknown';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tabId: string) => void;
  onSelectLead: (lead: Lead) => void;
  leads: Lead[];
}

const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, onNavigate, onSelectLead, leads }) => {
  const { addToast } = useToast();
  const [mode, setMode] = useState<CommandPaletteMode>('search');
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null!);
  const messagesEndRef = useRef<HTMLDivElement>(null!);
  const pathname = usePathname();
  const orgSlug = useMemo(() => parseWorkspaceRoute(pathname).orgSlug, [pathname]);

  const moduleDef = getModuleDefinition('system');
  const moduleAccent = moduleDef.theme.accent;
  const moduleGradient = `linear-gradient(135deg, ${moduleDef.theme.accent} 0%, #881337 100%)`;

  const { messages, isLoading: isThinking, error, sendText } = useAIModuleChat({
    moduleOverride: 'system',
    orgSlugOverride: orgSlug,
  });

  const extractMessageText = (message: unknown): string => {
    const obj = asObject(message);
    if (!obj) return '';
    if (typeof obj.content === 'string') return obj.content;
    const parts = obj.parts;
    if (Array.isArray(parts)) {
      let text = '';
      for (const part of parts) {
        const pObj = asObject(part);
        if (pObj?.type === 'text' && typeof pObj.text === 'string') text += pObj.text;
        else if (typeof part === 'string') text += part;
      }
      return text;
    }
    if (typeof obj.text === 'string') return obj.text;
    return '';
  };

  useEffect(() => {
    if (!isOpen) {
      setMode('search');
      setQuery('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => inputRef.current?.focus(), 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen, mode]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100);
    }
  }, [messages, isThinking]);

  useEffect(() => {
    if (mode === 'chat' && inputRef.current instanceof HTMLTextAreaElement) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`;
    }
  }, [query, mode]);

  if (!isOpen) return null;

  const filteredNav = NAV_ITEMS.filter(item => 
    item.label.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 3);

  const filteredLeads = leads.filter(lead => 
    lead.name.toLowerCase().includes(query.toLowerCase()) ||
    lead.company?.toLowerCase().includes(query.toLowerCase()) ||
    lead.phone.includes(query)
  ).slice(0, 5);

  const filteredAssets = QUICK_ASSETS.filter(asset => 
    asset.label.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelectNav = (id: string) => { onNavigate(id); onClose(); };
  const handleSelectLead = (lead: Lead) => { onSelectLead(lead); onClose(); };
  const handleCopyAsset = (value: string, type: string) => {
    navigator.clipboard.writeText(value);
    addToast(`${type === 'link' ? 'קישור' : 'תוכן'} הועתק ללוח`, 'success');
    onClose();
  };
  const handleWhatsappAsset = (value: string) => {
    window.open(`https://wa.me/?text=${encodeURIComponent(value)}`, '_blank');
    onClose();
  };

  const handleSendMessage = () => {
    if (query.trim().length >= 1 && !isThinking) {
      sendText(query);
      setQuery('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (mode === 'chat') handleSendMessage();
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[300] bg-slate-900/60 backdrop-blur-sm flex items-start justify-center px-3 sm:px-4 transition-all duration-300" onClick={onClose} style={{ paddingTop: '6vh' }}>
      <div 
        className={`w-full bg-white rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden border border-slate-200/60 animate-scale-in transform transition-all ${
          mode === 'chat' ? 'max-w-3xl h-[80vh] flex flex-col' : 'max-w-lg'
        }`}
        onClick={e => e.stopPropagation()}
        dir="rtl"
      >
        <CommandPaletteHeader
          mode={mode}
          onModeChange={setMode}
          onClose={onClose}
          inputRef={inputRef}
          moduleGradient={moduleGradient}
          moduleAccent={moduleAccent}
        />

        {mode === 'chat' ? (
          <CommandPaletteChat
            query={query}
            setQuery={setQuery}
            messages={messages}
            isThinking={isThinking}
            error={error}
            messagesEndRef={messagesEndRef}
            inputRef={inputRef as React.RefObject<HTMLTextAreaElement>}
            extractMessageText={extractMessageText}
            handleSendMessage={handleSendMessage}
            sendText={sendText}
            starters={getSemanticStarters('system')}
            onKeyDown={handleKeyDown}
            moduleGradient={moduleGradient}
            moduleAccent={moduleAccent}
            moduleKey="system"
            orgSlug={orgSlug}
          />
        ) : (
          <>
            <div className="flex items-center gap-2.5 px-3 py-2.5 border-b border-slate-100 shrink-0">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} style={isThinking ? { color: moduleAccent } : undefined} />
                <input 
                  ref={inputRef as React.RefObject<HTMLInputElement>}
                  type="text" 
                  placeholder="חפש ליד, פעולה או מודול..."
                  className="w-full pr-9 pl-3 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-sm focus:outline-none focus:border-slate-300 focus:ring-1 focus:ring-slate-200/60 text-slate-800 placeholder:text-slate-400 font-medium transition-all"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
              </div>
            </div>

            <div className="max-h-[55vh] overflow-y-auto custom-scrollbar p-2 bg-white">
              {filteredAssets.length > 0 && (
                <div className="mb-1">
                  <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Link size={10} /> נכסים מהירים
                  </div>
                  <div className="space-y-0.5">
                    {filteredAssets.map(asset => (
                      <div key={asset.id} className="w-full text-right px-3 py-2.5 rounded-xl hover:bg-slate-50 flex items-center justify-between group transition-colors">
                        <div className="flex items-center gap-2.5">
                          <div className="p-1.5 bg-slate-100 rounded-lg" style={{ color: moduleAccent }}><Link size={14} /></div>
                          <span className="font-bold text-sm text-slate-700">{asset.label}</span>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                          <button onClick={() => handleCopyAsset(asset.value, asset.type)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600" title="העתק"><Copy size={14} /></button>
                          <button onClick={() => handleWhatsappAsset(asset.value)} className="p-1.5 hover:bg-emerald-50 rounded-lg text-emerald-500 hover:text-emerald-600" title="שלח בווצאפ"><Send size={14} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {filteredNav.length > 0 && (
                <div className="mb-1">
                  <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <LayoutGrid size={10} /> ניווט מהיר
                  </div>
                  <div className="space-y-0.5">
                    {filteredNav.map(item => {
                      const Icon = item.icon;
                      return (
                        <button key={item.id} onClick={() => handleSelectNav(item.id)} className="w-full text-right px-3 py-2.5 rounded-xl hover:bg-slate-50 flex items-center justify-between group transition-colors">
                          <div className="flex items-center gap-2.5">
                            <div className="p-1.5 bg-slate-50 border border-slate-200/60 text-slate-500 rounded-lg group-hover:text-white transition-all" onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = moduleAccent; (e.currentTarget as HTMLElement).style.borderColor = 'transparent'; }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = ''; (e.currentTarget as HTMLElement).style.borderColor = ''; }}>
                              {Icon && <Icon size={15} />}
                            </div>
                            <span className="font-bold text-sm text-slate-700 group-hover:text-slate-900">{item.label}</span>
                          </div>
                          <ArrowRight size={14} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-all" style={{ color: moduleAccent }} />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {filteredLeads.length > 0 && (
                <div>
                  <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <User size={10} /> לקוחות ולידים
                  </div>
                  <div className="space-y-0.5">
                    {filteredLeads.map(lead => (
                      <button key={lead.id} onClick={() => handleSelectLead(lead)} className="w-full text-right px-3 py-2.5 rounded-xl hover:bg-slate-50 flex items-center justify-between group transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs border transition-colors ${
                            lead.status === 'won' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-600 border-slate-200 group-hover:border-slate-300'
                          }`}>{lead.name.charAt(0)}</div>
                          <div>
                            <div className="font-bold text-slate-800 text-sm">{lead.name}</div>
                            <div className="text-xs text-slate-400 flex items-center gap-1.5">
                              <span>{lead.company || 'לקוח פרטי'}</span>
                              {lead.isHot && <span className="text-amber-500">🔥</span>}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-mono font-bold text-slate-600 group-hover:text-slate-800">₪{lead.value.toLocaleString()}</div>
                          <div className={`text-[10px] font-bold ${lead.status === 'won' ? 'text-emerald-600' : 'text-slate-400'}`}>{lead.status}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {query === '' && (
                <div className="py-6 px-4 text-center text-slate-400">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-slate-200/60" style={{ background: moduleGradient }}>
                    <Sparkles size={24} className="text-white" />
                  </div>
                  <p className="text-sm font-bold text-slate-600 mb-1">חיפוש חכם במודול System</p>
                  <p className="text-xs text-slate-400 mb-4">חפש ליד, נווט, או עבור לצ&apos;אט AI.</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {getSemanticStarters('system').slice(0, 3).map(s => (
                      <button
                        key={s.id}
                        onClick={() => { setMode('chat'); setTimeout(() => sendText(s.text), 200); }}
                        className="px-3 py-1.5 bg-white rounded-lg text-[11px] font-bold border transition-all hover:shadow-sm"
                        style={{ color: moduleAccent, borderColor: moduleAccent + '40' }}
                      >
                        {s.text}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {query !== '' && filteredNav.length === 0 && filteredLeads.length === 0 && filteredAssets.length === 0 && !isThinking && (
                <div className="py-6 px-4 text-center text-slate-400">
                  <p className="text-sm font-medium mb-1">לא נמצאו תוצאות עבור &quot;{query}&quot;</p>
                  <p className="text-xs text-slate-400">נסה לחפש משהו אחר או עבור לצ&apos;אט AI</p>
                </div>
              )}
            </div>

            <div className="px-3 py-2 bg-slate-50/80 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400 shrink-0">
              <div className="flex gap-3">
                <span className="flex items-center gap-1"><kbd className="bg-white border border-slate-200 rounded px-1 py-0.5 font-sans font-bold text-slate-500 text-[9px]">↵</kbd> לבחירה</span>
                <span className="flex items-center gap-1"><kbd className="bg-white border border-slate-200 rounded px-1 py-0.5 font-sans font-bold text-slate-500 text-[9px]">esc</kbd> לסגירה</span>
              </div>
              <div className="flex items-center gap-1 font-bold" style={{ color: moduleAccent }}>
                <Search size={9} /> System
              </div>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
};

export default CommandPalette;
