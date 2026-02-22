'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, Users, Sparkles, Megaphone, Calendar, ArrowLeft, CircleHelp, ArrowRight, MessageSquare, Database } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useApp } from '@/contexts/AppContext';
import { getSocialBasePath, joinPath, parseWorkspaceRoute } from '@/lib/os/social-routing';
import { Avatar } from '@/components/Avatar';
import { useAIModuleChat } from '@/components/command-palette/useAIModuleChat';
import { getSemanticStarters } from '@/components/command-palette/semanticStarters';
import { CommandPaletteHeader } from '@/components/command-palette/CommandPaletteHeader';
import { CommandPaletteChat } from '@/components/command-palette/CommandPaletteChat';
import type { CommandPaletteMode } from '@/components/command-palette/command-palette.types';
import { getModuleDefinition } from '@/lib/os/modules/registry';
import { Skeleton } from '@/components/ui/skeletons';
import { asObject } from '@/lib/shared/unknown';

export default function CommandPalette() {
  const router = useRouter();
  const pathname = usePathname();
  const basePath = getSocialBasePath(pathname);
  const workspaceRoute = parseWorkspaceRoute(pathname);
  const workspaceOrgId = workspaceRoute?.orgSlug;
  const { 
    isCommandPaletteOpen, 
    setIsCommandPaletteOpen, 
    clients, 
    setActiveClientId,
    setActiveDraft,
    setIsInviteModalOpen,
    setIsCampaignWizardOpen,
    setIsTourActive,
    activeClient,
    addToast 
  } = useApp();

  const [mode, setMode] = useState<CommandPaletteMode>('search');
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null!);
  const messagesEndRef = useRef<HTMLDivElement>(null!);

  const moduleDef = getModuleDefinition('social');
  const moduleAccent = moduleDef.theme.accent;
  const moduleGradient = `linear-gradient(135deg, ${moduleDef.theme.accent} 0%, #6D28D9 100%)`;

  const clientContext = useMemo(() => {
    if (!activeClient) return undefined;
    return {
      companyName: activeClient.companyName,
      name: activeClient.name,
      brandVoice: activeClient.brandVoice,
      dna: activeClient.dna,
      organizationId: workspaceOrgId || activeClient.organizationId,
    };
  }, [activeClient, workspaceOrgId]);

  const { messages, isLoading: isThinking, error, sendText } = useAIModuleChat({
    moduleOverride: 'social',
    orgSlugOverride: workspaceOrgId,
    context: clientContext,
    featureKeyOverride: 'social.chat',
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

  // Reset when palette closes
  useEffect(() => {
    if (!isCommandPaletteOpen) {
      setMode('search');
      setQuery('');
    }
  }, [isCommandPaletteOpen]);

  // Auto-focus + auto-scroll
  useEffect(() => {
    if (isCommandPaletteOpen) {
      const timer = setTimeout(() => inputRef.current?.focus(), 200);
      return () => clearTimeout(timer);
    }
  }, [isCommandPaletteOpen, mode]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100);
    }
  }, [messages, isThinking]);

  // Auto-resize textarea in chat mode
  useEffect(() => {
    if (mode === 'chat' && inputRef.current instanceof HTMLTextAreaElement) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`;
    }
  }, [query, mode]);

  if (!isCommandPaletteOpen) return null;

  // Commands list for search mode
  const allCommands = [
    { icon: CircleHelp, label: 'הפעל הדרכת מערכת', action: 'הפעל הדרכה' },
    { icon: Sparkles, label: 'צור פוסט חדש', action: 'פוסט חדש' },
    { icon: Users, label: 'הוסף לקוח למערכת', action: 'הוספת לקוח' },
    { icon: Megaphone, label: 'פתח קמפיין פרסום', action: 'קמפיין חדש' },
    { icon: Calendar, label: 'עבור ללוח שידורים', action: 'מעבר ללוח שנה' },
    { icon: Database, label: 'עבור לבנק תכנים', action: 'בנק תכנים' },
  ];
  const commands = allCommands.filter(c => c.label.toLowerCase().includes(query.toLowerCase()));
  const filteredClients = clients.filter(c => c.companyName.toLowerCase().includes(query.toLowerCase()));

  const handleAction = (action: string) => {
    setIsCommandPaletteOpen(false);
    switch (action) {
      case 'הפעל הדרכה': router.push(joinPath(basePath, '/dashboard')); setIsTourActive(true); break;
      case 'פוסט חדש': setActiveDraft(null); router.push(joinPath(basePath, '/machine')); break;
      case 'הוספת לקוח': setIsInviteModalOpen(true); break;
      case 'קמפיין חדש': setIsCampaignWizardOpen(true); break;
      case 'מעבר ללוח שנה': router.push(joinPath(basePath, '/calendar')); break;
      case 'בנק תכנים': router.push(joinPath(basePath, '/content-bank')); break;
    }
  };

  const handleSelectClient = (id: string) => {
    setActiveClientId(id);
    const c = clients.find((x) => String(x.id) === String(id));
    const name = String(c?.companyName || c?.name || '');
    router.push(joinPath(basePath, `/workspace?clientId=${encodeURIComponent(String(id))}&clientName=${encodeURIComponent(name)}`));
    setIsCommandPaletteOpen(false);
  };

  const handleSendMessage = () => {
    if (query.trim().length >= 1 && !isThinking) {
      sendText(query);
      setQuery('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsCommandPaletteOpen(false);
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (mode === 'chat') handleSendMessage();
    }
  };

  const onClose = () => setIsCommandPaletteOpen(false);

  return (
    <div className="fixed inset-0 z-[550] bg-slate-900/60 backdrop-blur-sm flex items-start justify-center px-3 sm:px-4 transition-all duration-300" onClick={onClose} style={{ paddingTop: '6vh' }}>
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
            starters={getSemanticStarters('social')}
            onKeyDown={handleKeyDown}
            moduleGradient={moduleGradient}
            moduleAccent={moduleAccent}
            moduleKey="social"
            orgSlug={workspaceOrgId}
          />
        ) : (
          <>
            <div className="flex items-center gap-2.5 px-3 py-2.5 border-b border-slate-100 shrink-0">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  ref={inputRef as React.RefObject<HTMLInputElement>}
                  type="text"
                  placeholder="חפש לקוח, פקודה או מודול..."
                  className="w-full pr-9 pl-3 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-sm focus:outline-none focus:border-slate-300 focus:ring-1 focus:ring-slate-200/60 text-slate-800 placeholder:text-slate-400 font-medium transition-all"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
              </div>
            </div>

            <div className="max-h-[55vh] overflow-y-auto custom-scrollbar p-2 bg-white">
              {query.length > 0 && filteredClients.length > 0 && (
                <div className="mb-1">
                  <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Users size={10} /> לקוחות
                  </div>
                  <div className="space-y-0.5">
                    {filteredClients.slice(0, 5).map(c => (
                      <button
                        key={c.id}
                        onClick={() => handleSelectClient(c.id)}
                        className="w-full text-right px-3 py-2.5 rounded-xl hover:bg-slate-50 flex items-center justify-between group transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar src={String(c.avatar || '')} name={String(c.companyName || c.name || '')} alt={String(c.companyName || '')} size="sm" rounded="xl" />
                          <span className="font-bold text-sm text-slate-700 group-hover:text-slate-900">{c.companyName}</span>
                        </div>
                        <ArrowRight size={14} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-all" style={{ color: moduleAccent }} />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mb-1">
                <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles size={10} /> פקודות וניווט מהיר
                </div>
                <div className="space-y-0.5">
                  {commands.map((cmd, i) => (
                    <button
                      key={i}
                      onClick={() => handleAction(cmd.action)}
                      className="w-full text-right px-3 py-2.5 rounded-xl hover:bg-slate-50 flex items-center justify-between group transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 bg-slate-50 border border-slate-200/60 text-slate-500 rounded-lg group-hover:text-white transition-all" onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = moduleAccent; (e.currentTarget as HTMLElement).style.borderColor = 'transparent'; }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = ''; (e.currentTarget as HTMLElement).style.borderColor = ''; }}>
                          <cmd.icon size={15} />
                        </div>
                        <span className="font-bold text-sm text-slate-700 group-hover:text-slate-900">{cmd.label}</span>
                      </div>
                      <ArrowRight size={14} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-all" style={{ color: moduleAccent }} />
                    </button>
                  ))}
                </div>
              </div>

              {query === '' && (
                <div className="py-6 px-4 text-center text-slate-400">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-slate-200/60" style={{ background: moduleGradient }}>
                    <Sparkles size={24} className="text-white" />
                  </div>
                  <p className="text-sm font-bold text-slate-600 mb-1">חיפוש חכם במודול Social</p>
                  <p className="text-xs text-slate-400 mb-4">חפש לקוח, נווט, או עבור לצ&apos;אט AI.</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {getSemanticStarters('social').slice(0, 3).map(s => (
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

              {query !== '' && filteredClients.length === 0 && commands.length === 0 && (
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
                <Search size={9} /> Social
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
