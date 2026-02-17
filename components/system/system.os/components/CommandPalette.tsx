import React, { useState, useEffect, useRef } from 'react';
import { Search, Command, ArrowRight, User, LayoutGrid, Calculator, Calendar, Sparkles, TrendingUp, CircleAlert, CircleCheckBig, Link, Copy, Send } from 'lucide-react';
import { Lead } from '../types';
import { NAV_ITEMS, QUICK_ASSETS } from '../constants';
import { useToast } from '../contexts/ToastContext';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tabId: string) => void;
  onSelectLead: (lead: Lead) => void;
  leads: Lead[];
}

const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, onNavigate, onSelectLead, leads }) => {
  const { addToast } = useToast();
  const [query, setQuery] = useState('');
  const [aiResponse, setAiResponse] = useState<{type: string, text: string} | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
        setQuery('');
        setAiResponse(null);
        setIsThinking(false);
    }
  }, [isOpen]);

  // AI Brain Logic
  useEffect(() => {
      if (query.length < 3) {
          setAiResponse(null);
          return;
      }

      const debounceTimer = setTimeout(async () => {
          // Heuristic to detect natural language questions vs simple search
          const lowerQ = query.toLowerCase();
          const isQuestion = lowerQ.includes('?') || lowerQ.split(' ').length > 3 || 
                             ['what', 'how', 'who', 'where', 'when', 'why', 'status', 'money', 'revenue', 'leads', 'מה', 'איך', 'כמה', 'מי', 'מתי', 'למה', 'מצב'].some(w => lowerQ.startsWith(w) || lowerQ.includes(w));

          if (isQuestion) {
              setIsThinking(true);
              try {
                  // Construct Context
                  const stats = {
                      totalLeads: leads.length,
                      wonLeads: leads.filter(l => l.status === 'won').length,
                      totalRevenue: leads.filter(l => l.status === 'won').reduce((sum, l) => sum + l.value, 0),
                      hotLeads: leads.filter(l => l.isHot).length,
                      recentActivity: leads.slice(0, 3).map(l => `${l.name}: ${l.status}`)
                  };

                  const res = await fetch('/api/ai/analyze', {
                      method: 'POST',
                      headers: { 'content-type': 'application/json' },
                      body: JSON.stringify({
                          query: `User Query: "${query}"\n\nContext Data (JSON): ${JSON.stringify(stats)}`,
                          rawData: stats,
                      }),
                  });

                  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
                  const result = data?.result && typeof data.result === 'object' ? (data.result as Record<string, unknown>) : null;
                  const text = String(result?.summary || 'מצטער, לא הצלחתי לעבד את הבקשה כרגע.');
                  setAiResponse({ type: res.ok ? 'success' : 'error', text });
              } catch (error) {
                  console.error("AI Error:", error);
                  setAiResponse({ type: 'error', text: 'מצטער, לא הצלחתי לעבד את הבקשה כרגע.' });
              } finally {
                  setIsThinking(false);
              }
          } else {
              setAiResponse(null);
              setIsThinking(false);
          }
      }, 800);

      return () => clearTimeout(debounceTimer);
  }, [query, leads]);

  if (!isOpen) return null;

  // Filter Logic
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

  const handleSelectNav = (id: string) => {
      onNavigate(id);
      onClose();
  };

  const handleSelectLead = (lead: Lead) => {
      onSelectLead(lead);
      onClose();
  };

  const handleCopyAsset = (value: string, type: string) => {
      navigator.clipboard.writeText(value);
      addToast(`${type === 'link' ? 'קישור' : 'תוכן'} הועתק ללוח`, 'success');
      onClose();
  };

  const handleWhatsappAsset = (value: string) => {
      window.open(`https://wa.me/?text=${encodeURIComponent(value)}`, '_blank');
      onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-start justify-center pt-[12vh] transition-all duration-200" onClick={onClose}>
      <div 
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden ring-1 ring-white/20 animate-scale-in transform transition-all"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-4 p-5 border-b border-slate-100 bg-white relative">
            <Search className={`transition-colors ${isThinking ? 'text-rose-600 animate-pulse' : 'text-slate-400'}`} size={24} />
            <input 
                ref={inputRef}
                type="text" 
                placeholder="שאל את Misrad AI או חפש..."
                className="flex-1 bg-transparent text-xl focus:outline-none text-slate-800 placeholder:text-slate-300 font-medium h-10"
                value={query}
                onChange={e => setQuery(e.target.value)}
            />
            <div className="flex items-center gap-2">
                {isThinking && (
                    <div className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-rose-600 rounded-full animate-bounce"></span>
                        <span className="w-1.5 h-1.5 bg-rose-600 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></span>
                        <span className="w-1.5 h-1.5 bg-rose-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></span>
                    </div>
                )}
                <div className="hidden md:flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-lg text-[10px] font-bold text-slate-500 uppercase border border-slate-200">
                    <span className="text-xs">ESC</span>
                </div>
            </div>
        </div>
        
        <div className="max-h-[60vh] overflow-y-auto custom-scrollbar p-2 bg-slate-50/50">
            
            {/* AI ANSWER */}
            {aiResponse && (
                <div className="mb-4 mx-2 mt-2 animate-slide-down">
                    <div className="bg-slate-900 rounded-xl p-4 text-white shadow-lg relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/20 rounded-full blur-2xl"></div>
                        <div className="relative z-10 flex gap-3">
                            <div className="p-2 bg-rose-600 rounded-lg h-fit shadow-md shadow-rose-900/20">
                                <Sparkles size={18} className="text-yellow-300" />
                            </div>
                            <div>
                                <div className="text-[10px] font-bold text-rose-300 uppercase tracking-wider mb-1">Misrad AI</div>
                                <div className="text-sm font-medium leading-relaxed">{aiResponse.text}</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Quick Assets */}
            {filteredAssets.length > 0 && (
                <div className="mb-2">
                    <div className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                        <Link size={10} /> נכסים מהירים (Quick Assets)
                    </div>
                    <div className="space-y-1">
                        {filteredAssets.map(asset => (
                            <div 
                                key={asset.id}
                                className="w-full text-right px-4 py-3 rounded-xl bg-white hover:shadow-sm border border-transparent hover:border-slate-200 flex items-center justify-between group transition-all"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-rose-50 text-rose-600 rounded-lg shadow-sm">
                                        <Link size={16} />
                                    </div>
                                    <span className="font-bold text-slate-700">{asset.label}</span>
                                </div>
                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                    <button 
                                        onClick={() => handleCopyAsset(asset.value, asset.type)}
                                        className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600"
                                        title="העתק"
                                    >
                                        <Copy size={14} />
                                    </button>
                                    <button 
                                        onClick={() => handleWhatsappAsset(asset.value)}
                                        className="p-1.5 hover:bg-emerald-50 rounded text-emerald-500 hover:text-emerald-700"
                                        title="שלח בווצאפ"
                                    >
                                        <Send size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Quick Navigation */}
            {filteredNav.length > 0 && (
                <div className="mb-2">
                    <div className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                        <LayoutGrid size={10} /> ניווט מהיר
                    </div>
                    <div className="space-y-1">
                        {filteredNav.map(item => {
                            const Icon = item.icon;
                            return (
                                <button 
                                    key={item.id}
                                    onClick={() => handleSelectNav(item.id)}
                                    className="w-full text-right px-4 py-3 rounded-xl hover:bg-white hover:shadow-sm hover:ring-1 hover:ring-slate-200 flex items-center justify-between group transition-all"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-white border border-slate-200 text-slate-500 rounded-lg group-hover:bg-rose-50 group-hover:border-rose-100 group-hover:text-rose-700 transition-colors shadow-sm">
                                            <Icon size={16} />
                                        </div>
                                        <span className="font-bold text-slate-700 group-hover:text-slate-900">{item.label}</span>
                                    </div>
                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all transform group-hover:-translate-x-1">
                                        <span className="text-[10px] font-bold text-slate-300 uppercase">עבור</span>
                                        <ArrowRight size={14} className="text-rose-600" />
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Leads */}
            {filteredLeads.length > 0 && (
                <div>
                     <div className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2 mt-2">
                        <User size={10} /> לקוחות ולידים
                     </div>
                     <div className="space-y-1">
                        {filteredLeads.map(lead => (
                            <button 
                                key={lead.id}
                                onClick={() => handleSelectLead(lead)}
                                className="w-full text-right px-4 py-3 rounded-xl hover:bg-white hover:shadow-sm hover:ring-1 hover:ring-slate-200 flex items-center justify-between group transition-all"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs border transition-colors shadow-sm ${
                                        lead.status === 'won' 
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                        : 'bg-white text-slate-500 border-slate-200 group-hover:border-rose-200 group-hover:text-rose-700'
                                    }`}>
                                        {lead.name.charAt(0)}
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-800 text-sm group-hover:text-rose-700">{lead.name}</div>
                                        <div className="text-xs text-slate-400 flex items-center gap-1.5">
                                            <span>{lead.company || 'לקוח פרטי'}</span>
                                            {lead.isHot && <span className="text-amber-500">🔥</span>}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs font-mono font-bold text-slate-600 group-hover:text-slate-900">
                                        ₪{lead.value.toLocaleString()}
                                    </div>
                                    <div className={`text-[10px] font-bold ${lead.status === 'won' ? 'text-emerald-600' : 'text-slate-400'}`}>
                                        {lead.status}
                                    </div>
                                </div>
                            </button>
                        ))}
                     </div>
                </div>
            )}

            {query === '' && (
                <div className="p-12 text-center text-slate-400 opacity-60">
                    <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-200">
                        <Command size={32} />
                    </div>
                    <p className="text-sm font-medium">מה תרצה לעשות היום?</p>
                    <p className="text-xs mt-1">חפש ליד, נווט לעמוד, או שאל שאלה.</p>
                </div>
            )}
            
            {query !== '' && filteredNav.length === 0 && filteredLeads.length === 0 && filteredAssets.length === 0 && !aiResponse && !isThinking && (
                 <div className="p-8 text-center text-slate-400">
                    <p className="text-sm font-medium">לא נמצאו תוצאות עבור "{query}"</p>
                </div>
            )}

        </div>
        
        <div className="p-3 bg-white border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400 px-6">
             <div className="flex gap-4">
                 <span className="flex items-center gap-1"><kbd className="bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 font-sans font-bold text-slate-500">↵</kbd> לבחירה</span>
                 <span className="flex items-center gap-1"><kbd className="bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 font-sans font-bold text-slate-500">↑↓</kbd> לניווט</span>
             </div>
             <div className="flex items-center gap-1 text-rose-600 font-bold">
                 <Sparkles size={10} /> Misrad AI Active
             </div>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;