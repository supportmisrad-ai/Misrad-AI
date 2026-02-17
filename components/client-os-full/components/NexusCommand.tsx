import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Search, Command, ArrowRight, CircleUser, LayoutDashboard, Briefcase, Calculator, Users, Zap, SquareCheck, Sparkles, MessageSquare, CornerDownLeft, FileText } from 'lucide-react';
import { useNexus } from '../context/ClientContext';
import { HealthStatus } from '../types';
import { usePathname } from 'next/navigation';
import { parseWorkspaceRoute } from '@/lib/os/social-routing';
import { useAIModuleChat } from '@/components/command-palette/useAIModuleChat';
import { getSemanticStarters } from '@/components/command-palette/semanticStarters';
import { ChatSources } from '@/components/command-palette/ChatSources';
import { Skeleton } from '@/components/ui/skeletons';

interface NexusCommandProps {
  onNavigate: (view: string) => void;
  onSelectClient: (id: string) => void;
}

type CommandItemType = 'NAV' | 'CLIENT' | 'ACTION' | 'AI';

interface CommandResult {
  id: string;
  type: CommandItemType;
  label: string;
  subLabel?: string;
  icon: React.ElementType;
  action: () => void;
  meta?: any;
}

const NexusCommand: React.FC<NexusCommandProps> = ({ onNavigate, onSelectClient }) => {
  const { clients } = useNexus();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const pathname = usePathname();
  const orgSlug = useMemo(() => parseWorkspaceRoute(pathname).orgSlug, [pathname]);

  const { messages, isLoading: isAiThinking, error, sendText, clear } = useAIModuleChat({
    moduleOverride: 'client',
    orgSlugOverride: orgSlug,
  });

  const lastAssistant = useMemo(() => {
    const list = Array.isArray(messages) ? messages : [];
    return [...list].reverse().find((m) => m.role === 'assistant') || null;
  }, [messages]);

  const lastAsRec = lastAssistant as Record<string, unknown> | null;
  const aiResponse = lastAssistant ? String(lastAsRec?.content || '') : null;
  const aiSources = lastAssistant && Array.isArray(lastAsRec?.sources) ? lastAsRec.sources : [];

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Toggle Command Palette with Cmd+K / Ctrl+K and Custom Event
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    const handleOpenEvent = () => setIsOpen(true);

    document.addEventListener('keydown', handleKeyDown, { capture: true });
    window.addEventListener('open-nexus-command', handleOpenEvent);
    
    return () => {
        document.removeEventListener('keydown', handleKeyDown, { capture: true });
        window.removeEventListener('open-nexus-command', handleOpenEvent);
    };
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      clear();
    }
  }, [isOpen]);

  // Generate Results based on Query
  const getResults = (): CommandResult[] => {
    if (!query) {
      // Default State: Recent & Common
      return [
        { id: 'nav-dash', type: 'NAV', label: 'ראשי', icon: LayoutDashboard, action: () => onNavigate('dashboard') },
        { id: 'nav-clients', type: 'NAV', label: 'לקוחות', icon: Users, action: () => onNavigate('clients') },
        {
          id: 'act-task',
          type: 'ACTION',
          label: 'משימה חדשה',
          icon: SquareCheck,
          action: () =>
            window.dispatchEvent(
              new CustomEvent('nexus-toast', { detail: { message: 'יצירת משימה אינה זמינה כרגע.', type: 'info' } })
            ),
        },
        {
          id: 'act-meet',
          type: 'ACTION',
          label: 'קבע פגישה',
          icon: Briefcase,
          action: () =>
            window.dispatchEvent(
              new CustomEvent('nexus-toast', { detail: { message: 'קביעת פגישה אינה זמינה כרגע.', type: 'info' } })
            ),
        },
      ];
    }

    // AI Mode Trigger
    if (query.startsWith('?') || query.startsWith('מה') || query.startsWith('מי')) {
      return [{
        id: 'ask-nexus',
        type: 'AI',
        label: 'שאל את Nexus',
        subLabel: 'לחץ Enter לקבלת תשובה',
        icon: Sparkles,
        action: () => sendText(query),
      }];
    }

    const results: CommandResult[] = [];

    // 1. Navigation
    if ('ראשי'.includes(query)) results.push({ id: 'nav-dash', type: 'NAV', label: 'ראשי', icon: LayoutDashboard, action: () => onNavigate('dashboard') });
    if ('לקוחות'.includes(query)) results.push({ id: 'nav-clients', type: 'NAV', label: 'לקוחות', icon: Users, action: () => onNavigate('clients') });
    if ('הגדרות'.includes(query)) results.push({ id: 'nav-settings', type: 'NAV', label: 'הגדרות', icon: Calculator, action: () => onNavigate('settings') });
    if ('הקלטות'.includes(query)) results.push({ id: 'nav-intel', type: 'NAV', label: 'הקלטות', icon: FileText, action: () => onNavigate('intelligence') });

    // 2. Clients
    clients.forEach(client => {
      if (client.name.toLowerCase().includes(query.toLowerCase()) || client.logoInitials.toLowerCase().includes(query.toLowerCase())) {
        results.push({
          id: `client-${client.id}`,
          type: 'CLIENT',
          label: client.name,
          subLabel: client.industry,
          icon: CircleUser,
          action: () => onSelectClient(client.id),
          meta: client.healthStatus
        });
      }
    });

    // 3. Actions
    if ('משימה'.includes(query) || 'task'.includes(query.toLowerCase())) {
      results.push({
        id: 'act-task',
        type: 'ACTION',
        label: 'משימה חדשה',
        icon: SquareCheck,
        action: () =>
          window.dispatchEvent(
            new CustomEvent('nexus-toast', { detail: { message: 'יצירת משימה אינה זמינה כרגע.', type: 'info' } })
          ),
      });
    }
    if ('מייל'.includes(query) || 'email'.includes(query.toLowerCase())) {
      results.push({
        id: 'act-email',
        type: 'ACTION',
        label: 'שלח מייל',
        icon: MessageSquare,
        action: () =>
          window.dispatchEvent(
            new CustomEvent('nexus-toast', { detail: { message: 'שליחת מייל אינה זמינה כרגע.', type: 'info' } })
          ),
      });
    }

    return results;
  };

  const results = getResults();

  // Keyboard Navigation for List
  useEffect(() => {
    const handleListNav = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % results.length);
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + results.length) % results.length);
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        if (results[selectedIndex]) {
          results[selectedIndex].action();
          if (results[selectedIndex].type !== 'AI') {
            setIsOpen(false);
          }
        }
      }
    };
    window.addEventListener('keydown', handleListNav);
    return () => window.removeEventListener('keydown', handleListNav);
  }, [isOpen, results, selectedIndex]);

  const starters = getSemanticStarters('client');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] animate-fade-in">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-nexus-primary/40 backdrop-blur-sm" onClick={() => setIsOpen(false)}></div>

      {/* Main Container */}
      <div className="w-full max-w-2xl bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/50 overflow-hidden relative flex flex-col max-h-[60vh] animate-slide-up transform transition-all">
        
        {/* Input Header */}
        <div className="flex items-center gap-4 p-6 border-b border-gray-200/50">
          <Command className="text-gray-400" size={24} />
          <input 
            ref={inputRef}
            type="text" 
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
            placeholder="חפש משהו או שאל אותי..."
            className="flex-1 bg-transparent text-xl font-display font-medium text-gray-900 placeholder-gray-400 outline-none border-none"
          />
          <div className="px-2 py-1 bg-gray-100 rounded text-xs font-bold text-gray-400 border border-gray-200">ESC</div>
        </div>

        {/* Semantic Starters */}
        {starters.length > 0 && (
          <div className="px-6 pt-5 pb-3 border-b border-gray-100 bg-white/80">
            <div className="flex flex-wrap gap-2">
              {starters.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    sendText(s.text);
                    setQuery('');
                    setSelectedIndex(0);
                  }}
                  disabled={isAiThinking}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl bg-white border border-gray-200 text-gray-700 text-xs font-bold hover:border-nexus-accent/40 hover:text-gray-900 transition-all"
                >
                  <Sparkles size={14} className="text-nexus-accent" />
                  {s.text}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* AI Response Area */}
        {isAiThinking && (
          <div className="p-6 bg-nexus-bg border-b border-gray-100 flex items-center gap-3">
            <Skeleton className="w-5 h-5 rounded-full" />
            <span className="text-sm font-medium text-gray-600">חושב על זה...</span>
          </div>
        )}
        {aiResponse && (
          <div className="p-6 bg-gradient-to-r from-nexus-bg to-white border-b border-gray-100 flex gap-4">
            <div className="p-2 bg-nexus-accent/10 rounded-lg h-fit">
              <Sparkles className="text-nexus-accent" size={20} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">תשובה</h4>
              <p className="text-gray-800 text-sm leading-relaxed">{aiResponse}</p>
              {Array.isArray(aiSources) && aiSources.length ? (
                <ChatSources sources={aiSources} />
              ) : null}
            </div>
          </div>
        )}

        {/* Results List */}
        <div ref={listRef} className="overflow-y-auto p-2 custom-scrollbar">
          {results.length > 0 ? (
            <div className="space-y-1">
              {/* Grouping logic could go here, flattening for now */}
              {results.map((item, index) => (
                <div 
                  key={item.id}
                  onClick={item.action}
                  className={`flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-all ${index === selectedIndex ? 'bg-nexus-primary text-white shadow-lg shadow-nexus-primary/20 scale-[1.01]' : 'text-gray-600 hover:bg-gray-50'}`}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <div className={`p-2 rounded-lg ${index === selectedIndex ? 'bg-white/10' : 'bg-gray-100 text-gray-500'}`}>
                    <item.icon size={18} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm">{item.label}</span>
                      {item.type === 'AI' && <span className="text-[10px] bg-nexus-accent text-white px-1.5 rounded font-bold">AI</span>}
                      {item.type === 'NAV' && <span className="text-[10px] bg-white/20 px-1.5 rounded font-bold opacity-70">לך ל...</span>}
                    </div>
                    {item.subLabel && <span className={`text-xs ${index === selectedIndex ? 'text-white/60' : 'text-gray-400'}`}>{item.subLabel}</span>}
                  </div>
                  
                  {/* Metadata / Shortcuts */}
                  <div className="flex items-center gap-3">
                    {item.type === 'CLIENT' && item.meta && (
                      <span className={`w-2 h-2 rounded-full ${item.meta === HealthStatus.CRITICAL ? 'bg-red-500' : item.meta === HealthStatus.THRIVING ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                    )}
                    {index === selectedIndex && <CornerDownLeft size={16} className="opacity-50" />}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-gray-400">
              <Search size={32} className="mx-auto mb-2 opacity-20" />
              <p className="text-sm">לא מצאתי כלום</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NexusCommand;