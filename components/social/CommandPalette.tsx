'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, X, Users, Sparkles, Megaphone, Calendar, Home, ArrowLeft, CircleHelp, MessageSquare, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname, useRouter } from 'next/navigation';
import { useApp } from '@/contexts/AppContext';
import { getSocialBasePath, joinPath, parseWorkspaceRoute } from '@/lib/os/social-routing';
import { Avatar } from '@/components/Avatar';
import { useAIModuleChat } from '@/components/command-palette/useAIModuleChat';
import { ChatSources } from '@/components/command-palette/ChatSources';
import { getSemanticStarters } from '@/components/command-palette/semanticStarters';
import { Skeleton } from '@/components/ui/skeletons';

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

  const [query, setQuery] = useState('');
  const [isChatMode, setIsChatMode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);

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

  const { messages, isLoading, error, sendText, clear } = useAIModuleChat({
    moduleOverride: 'social',
    orgSlugOverride: workspaceOrgId,
    context: clientContext,
    featureKeyOverride: 'social.chat',
  });

  const [chatInput, setChatInput] = useState('');

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (isChatMode && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isChatMode]);

  // Auto-focus chat input when entering chat mode
  useEffect(() => {
    if (isChatMode && chatInputRef.current) {
      // Small delay to ensure the input is rendered
      setTimeout(() => {
        chatInputRef.current?.focus();
      }, 100);
    }
  }, [isChatMode]);

  // Define commands list
  const allCommands = [
    { icon: CircleHelp, label: 'הפעל הדרכת מערכת', action: 'הפעל הדרכה' },
    { icon: Sparkles, label: 'צור פוסט חדש', action: 'פוסט חדש' },
    { icon: Users, label: 'הוסף לקוח למערכת', action: 'הוספת לקוח' },
    { icon: Megaphone, label: 'פתח קמפיין פרסום', action: 'קמפיין חדש' },
    { icon: Calendar, label: 'עבור ללוח שידורים', action: 'מעבר ללוח שנה' },
  ];
  
  const commands = allCommands.filter(c => c.label.toLowerCase().includes(query.toLowerCase()));

  // Detect chat mode triggers: "?", "/chat", "/ai", or manual toggle
  useEffect(() => {
    if (query.length > 0 && !isChatMode) {
      const lowerQuery = query.toLowerCase().trim();
      // Check for chat triggers
      if (lowerQuery === '?' || lowerQuery === '/chat' || lowerQuery === '/ai' || lowerQuery.startsWith('/chat ') || lowerQuery.startsWith('/ai ')) {
        setIsChatMode(true);
        // Remove trigger from query if it's a command
        if (lowerQuery.startsWith('/chat ')) {
          setQuery(query.substring(6));
        } else if (lowerQuery.startsWith('/ai ')) {
          setQuery(query.substring(4));
        } else if (lowerQuery === '?' || lowerQuery === '/chat' || lowerQuery === '/ai') {
          setQuery('');
        }
        return;
      }
    } else if (query.length === 0 && isChatMode) {
      // Don't auto-close chat mode when query is empty - let user decide
    }
  }, [query, isChatMode]);

  // Reset when palette closes
  useEffect(() => {
    if (!isCommandPaletteOpen) {
      setQuery('');
      setIsChatMode(false);
      setChatInput('');
      clear();
    }
  }, [isCommandPaletteOpen]);

  if (!isCommandPaletteOpen) return null;

  const filteredClients = clients.filter(c => 
    c.companyName.toLowerCase().includes(query.toLowerCase())
  );

  const handleAction = (action: string) => {
    setIsCommandPaletteOpen(false);
    switch (action) {
      case 'הפעל הדרכה':
        router.push(joinPath(basePath, '/dashboard'));
        setIsTourActive(true);
        break;
      case 'פוסט חדש':
        setActiveDraft(null);
        router.push(joinPath(basePath, '/machine'));
        break;
      case 'הוספת לקוח':
        setIsInviteModalOpen(true);
        break;
      case 'קמפיין חדש':
        setIsCampaignWizardOpen(true);
        break;
      case 'מעבר ללוח שנה':
        router.push(joinPath(basePath, '/calendar'));
        break;
    }
  };

  const handleSelectClient = (id: string) => {
    setActiveClientId(id);
    const c = clients.find((x) => String(x.id) === String(id));
    const name = String(c?.companyName || c?.name || '');
    router.push(
      joinPath(basePath, `/workspace?clientId=${encodeURIComponent(String(id))}&clientName=${encodeURIComponent(name)}`)
    );
    setIsCommandPaletteOpen(false);
  };
  
  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (chatInput.trim()) {
      sendText(chatInput);
      setChatInput('');
      setQuery('');
      // Refocus input after sending message
      setTimeout(() => {
        chatInputRef.current?.focus();
      }, 50);
    }
  };

  return (
    <AnimatePresence>
      {isCommandPaletteOpen && (
        <div className="fixed inset-0 z-[550] flex items-start justify-center pt-[6vh] px-3 sm:px-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsCommandPaletteOpen(false)}>
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }} 
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="w-full max-w-2xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] border border-slate-200/60"
            onClick={e => e.stopPropagation()}
            dir="rtl"
          >
             {/* Header */}
             <div className="px-4 py-3 border-b border-slate-200/60 flex items-center gap-3 bg-white">
               <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${isChatMode ? 'bg-purple-600 text-white shadow-sm' : 'bg-slate-100 text-slate-500'}`}>
                 {isChatMode ? <MessageSquare size={18} /> : <Search size={18} />}
               </div>
               {!isChatMode ? (
                 <>
                   <input 
                     ref={inputRef}
                     autoFocus
                     type="text" 
                     placeholder="חפש לקוח, פקודה, או הקלד ? לצ׳אט..." 
                     className="flex-1 outline-none text-base font-bold bg-transparent"
                     value={query}
                     onChange={e => setQuery(e.target.value)}
                     onKeyDown={(e) => {
                       if (e.key === 'Escape') {
                         setIsCommandPaletteOpen(false);
                       }
                     }}
                   />
                   <button
                     onClick={() => {
                       setIsChatMode(true);
                       setQuery('');
                     }}
                     className="px-3 py-1.5 bg-purple-600 text-white rounded-lg font-bold text-xs hover:bg-purple-700 transition-colors flex items-center gap-1.5 shadow-sm"
                     title="הפעל מצב צ׳אט AI"
                   >
                     <Sparkles size={13} />
                     AI
                   </button>
                 </>
               ) : (
                 <>
                   <div className="flex-1">
                     <p className="text-sm font-black text-slate-600 mb-1">עוזר AI אישי</p>
                     <p className="text-xs text-slate-400">שאל אותי כל שאלה על המערכת</p>
                   </div>
                   <button
                     onClick={() => {
                       setIsChatMode(false);
                       setQuery('');
                       setChatInput('');
                       clear();
                     }}
                     className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg font-bold text-xs hover:bg-slate-200 transition-colors flex items-center gap-1.5"
                     title="חזור למצב חיפוש"
                   >
                     <Search size={13} />
                     חיפוש
                   </button>
                 </>
               )}
               <button onClick={() => setIsCommandPaletteOpen(false)} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
                 <X size={16} className="text-slate-400"/>
               </button>
             </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden flex flex-col">
              {isChatMode ? (
                // Chat Mode
                <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-b from-slate-50 via-white to-slate-50 flex flex-col gap-5 min-h-0">
                  <div className="flex flex-wrap gap-2">
                    {getSemanticStarters('social').map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          sendText(s.text);
                          setChatInput('');
                          setQuery('');
                        }}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl bg-white/90 border border-slate-200/60 text-slate-700 text-xs font-black hover:bg-white hover:border-purple-200/70 hover:text-slate-900 transition-all"
                        disabled={isLoading}
                      >
                        <Sparkles size={14} className="text-purple-600" />
                        {s.text}
                      </button>
                    ))}
                  </div>

                  {messages.length === 0 && (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex-1 flex items-center justify-center"
                    >
                      <div className="text-center max-w-md">
                        <div className="w-20 h-20 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-purple-500/20">
                          <Sparkles size={36} className="text-white" />
                        </div>
                        <p className="text-2xl font-black text-slate-800 mb-3">איך אוכל לעזור לך?</p>
                        <p className="text-sm text-slate-500 leading-relaxed">שאל אותי כל שאלה על המערכת, הלקוחות, הפוסטים ועוד</p>
                      </div>
                    </motion.div>
                  )}
                  
                  {messages.map((message, index) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.2, delay: index * 0.05 }}
                      className={`flex items-end gap-3 ${
                        message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                      }`}
                    >
                      {message.role === 'assistant' && (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-lg">
                          <Sparkles size={16} className="text-white" />
                        </div>
                      )}
                      
                      <div
                        className={`relative px-5 py-4 rounded-3xl max-w-[80%] shadow-lg leading-relaxed transition-all duration-200 ${
                          message.role === 'user'
                            ? 'bg-gradient-to-br from-purple-600 to-purple-700 text-white rounded-tr-md shadow-purple-500/30'
                            : 'bg-white text-slate-800 rounded-tl-md shadow-slate-200/50 border border-slate-100'
                        }`}
                      >
                        <div className={`whitespace-pre-wrap text-[15px] ${message.role === 'user' ? 'font-semibold' : 'font-medium'}`}>
                          {String(message.content || '')}
                        </div>
                        {isLoading && message.id === messages[messages.length - 1]?.id && message.role === 'assistant' && (
                          <div className="mt-3 space-y-2">
                            <Skeleton className="h-3 w-40 rounded-xl bg-purple-200/60" />
                            <Skeleton className="h-3 w-52 rounded-xl bg-purple-200/60" />
                          </div>
                        )}

                        {message.role === 'assistant' && message.sources && message.sources.length ? (
                          <ChatSources sources={message.sources} />
                        ) : null}
                      </div>
                      
                      {message.role === 'user' && (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-400 to-slate-500 flex items-center justify-center flex-shrink-0 shadow-lg">
                          <span className="text-white text-xs font-black">א</span>
                        </div>
                      )}
                    </motion.div>
                  ))}
                  
                  {isLoading && messages[messages.length - 1]?.role === 'user' && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-end gap-3 flex-row"
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-lg">
                        <Sparkles size={16} className="text-white" />
                      </div>
                      <div className="bg-white px-5 py-4 rounded-3xl rounded-tl-md shadow-lg shadow-slate-200/50 border border-slate-100">
                        <div className="space-y-2 w-40">
                          <Skeleton className="h-3 w-32 rounded-xl" />
                          <Skeleton className="h-3 w-28 rounded-xl" />
                        </div>
                      </div>
                    </motion.div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>
              ) : (
                // Search Mode
                <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-8 min-h-0">
                  {query.length === 0 && (
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 px-4">שאלות מנחות</p>
                      <div className="flex flex-wrap gap-2 px-4">
                        {getSemanticStarters('social').map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => {
                              setIsChatMode(true);
                              setQuery('');
                              sendText(s.text);
                            }}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl bg-white/90 border border-slate-200/60 text-slate-700 text-xs font-black hover:bg-white hover:border-purple-200/70 hover:text-slate-900 transition-all"
                            disabled={isLoading}
                          >
                            <Sparkles size={14} className="text-purple-600" />
                            {s.text}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {query.length > 0 && filteredClients.length > 0 && (
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 px-4">לקוחות</p>
                      <div className="flex flex-col gap-2">
                        {filteredClients.map(c => (
                          <button 
                            key={c.id} 
                            onClick={() => handleSelectClient(c.id)} 
                            className="w-full p-5 flex items-center gap-6 hover:bg-purple-50 rounded-3xl transition-all text-right group"
                          >
                            <Avatar
                              src={String(c.avatar || '')}
                              name={String(c.companyName || c.name || '')}
                              alt={String(c.companyName || '')}
                              size="lg"
                              rounded="2xl"
                              className="shadow-md"
                            />
                            <span className="font-black text-lg flex-1 text-slate-700">{c.companyName}</span>
                            <span className="text-xs font-black text-purple-600 opacity-0 group-hover:opacity-100 flex items-center gap-2">
                              ניהול לקוח <ArrowLeft size={16}/>
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 px-4">פקודות וניווט מהיר</p>
                    <div className="grid grid-cols-1 gap-2">
                      {commands.map((cmd, i) => (
                        <button 
                          key={i} 
                          onClick={() => {
                            handleAction(cmd.action);
                          }} 
                          className="flex items-center gap-6 p-5 hover:bg-slate-50 rounded-3xl transition-all text-right group"
                        >
                          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-purple-600 group-hover:text-white transition-all">
                            <cmd.icon size={22}/>
                          </div>
                          <span className="font-black text-lg text-slate-700">{cmd.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {query.length > 2 && filteredClients.length === 0 && commands.length === 0 && (
                    <div className="flex-1 flex items-center justify-center">
                      <div className="text-center">
                        <MessageSquare size={48} className="text-slate-300 mx-auto mb-4" />
                        <p className="text-lg font-black text-slate-600 mb-2">לא נמצאו תוצאות</p>
                        <p className="text-sm text-slate-400 mb-4">נסה לשאול אותי משהו במקום</p>
                        <button
                          onClick={() => setIsChatMode(true)}
                          className="px-6 py-3 bg-purple-600 text-white rounded-2xl font-black hover:bg-purple-700 transition-colors flex items-center gap-2 mx-auto"
                        >
                          <Sparkles size={18} />
                          שאל את ה-AI
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Chat Input */}
              {isChatMode && (
                <form onSubmit={handleChatSubmit} className="p-5 border-t border-slate-200/80 bg-white/80 backdrop-blur-sm flex gap-3">
                  <div className="flex-1 relative">
                    <input
                      ref={chatInputRef}
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="שאל אותי משהו..."
                      className="w-full bg-slate-100 rounded-2xl px-5 py-4 pr-14 font-semibold text-[15px] outline-none focus:ring-2 focus:ring-purple-500/40 focus:bg-white transition-all duration-200 placeholder:text-slate-400 border border-transparent focus:border-purple-200"
                      disabled={isLoading}
                      autoFocus
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading || !chatInput.trim()}
                    className="w-14 h-14 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 text-white rounded-2xl flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105 active:scale-95 transition-all duration-200 shadow-lg shadow-purple-500/30 hover:shadow-purple-500/40"
                  >
                    {isLoading ? (
                      <span className="text-sm font-black">...</span>
                    ) : (
                      <Send size={22} />
                    )}
                  </button>
                </form>
              )}
            </div>

            {/* Footer */}
            <div className="bg-slate-50/80 px-3 py-2 flex items-center justify-between border-t border-slate-100">
              <div className="flex gap-3 text-[10px] font-bold text-slate-400">
                {!isChatMode && (
                  <>
                    <span className="flex items-center gap-2">
                      <kbd className="bg-white border px-2 py-1 rounded shadow-sm">↵</kbd> לבחירה
                    </span>
                    <span className="flex items-center gap-2">
                      <kbd className="bg-white border px-2 py-1 rounded shadow-sm">esc</kbd> לסגירה
                    </span>
                  </>
                )}
                {isChatMode && (
                  <span className="flex items-center gap-2 text-purple-600">
                    <Sparkles size={12} />
                    מצב צ'אט פעיל
                  </span>
                )}
              </div>
              <p className="text-[10px] font-bold text-purple-600">Misrad AI</p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
