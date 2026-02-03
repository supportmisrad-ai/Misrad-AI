'use client';

import React from 'react';
import { Search, Link, Copy, Send, LayoutGrid, ArrowRight, User } from 'lucide-react';
import { Lead, LeadStatus } from '@/types';
import { useData } from '@/context/DataContext';
import { Skeleton } from '@/components/ui/skeletons';

interface CommandPaletteSearchProps {
  query: string;
  setQuery: (query: string) => void;
  isThinking: boolean;
  inputRef: React.RefObject<HTMLInputElement>;
  onKeyDown: (e: React.KeyboardEvent) => void;
  filteredNav: any[];
  filteredLeads: Lead[];
  filteredAssets: any[];
  onNavigate: (tabId: string) => void;
  onSelectLead: (lead: Lead) => void;
  onClose: () => void;

  moduleAccent: string;
}

export function CommandPaletteSearch({
  query,
  setQuery,
  isThinking,
  inputRef,
  onKeyDown,
  filteredNav,
  filteredLeads,
  filteredAssets,
  onNavigate,
  onSelectLead,
  onClose,
  moduleAccent
}: CommandPaletteSearchProps) {
  const { addToast } = useData();

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
    <>
      <div className="flex items-center gap-3 p-5 border-b border-slate-200/60 bg-gradient-to-r from-white via-slate-50/50 to-white backdrop-blur-xl shrink-0">
        <div className="relative flex-1 flex items-center gap-3">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors text-slate-400" size={20} style={isThinking ? { color: moduleAccent } : undefined} />
          <input 
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="text" 
            placeholder="חפש לידים, ניווט, או נכסים..."
            className="w-full pr-12 pl-4 py-4 bg-white/80 backdrop-blur-md border-2 border-slate-200/60 rounded-2xl text-lg focus:outline-none focus:border-slate-300 focus:ring-2 focus:ring-slate-400/40 text-slate-800 placeholder:text-slate-400 font-medium transition-all duration-200 shadow-sm"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
          />
          {isThinking && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <Skeleton className="w-2 h-2 rounded-full" />
              <Skeleton className="w-2 h-2 rounded-full" />
              <Skeleton className="w-2 h-2 rounded-full" />
            </div>
          )}
        </div>
      </div>

      <div className="max-h-[60vh] overflow-y-auto custom-scrollbar p-6 bg-gradient-to-b from-white via-slate-50/30 to-white">
        {filteredAssets.length > 0 && (
          <div className="mb-4">
            <div className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <Link size={12} /> נכסים מהירים
            </div>
            <div className="space-y-2">
              {filteredAssets.map(asset => (
                <div 
                  key={asset.id}
                  className="w-full text-right px-5 py-4 rounded-2xl bg-white/80 backdrop-blur-sm hover:bg-white hover:shadow-lg border border-slate-200/60 hover:border-slate-300 flex items-center justify-between group transition-all duration-200"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-slate-100 rounded-xl shadow-sm border border-white/50" style={{ color: moduleAccent }}>
                      <Link size={18} />
                    </div>
                    <span className="font-bold text-slate-800">{asset.label}</span>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                    <button 
                      onClick={() => handleCopyAsset(asset.value, asset.type)}
                      className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 hover:text-slate-700 transition-all"
                      title="העתק"
                    >
                      <Copy size={16} />
                    </button>
                    <button 
                      onClick={() => handleWhatsappAsset(asset.value)}
                      className="p-2 hover:bg-emerald-50 rounded-xl text-emerald-500 hover:text-emerald-700 transition-all"
                      title="שלח בווצאפ"
                    >
                      <Send size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {filteredNav.length > 0 && (
          <div className="mb-4">
            <div className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <LayoutGrid size={12} /> ניווט מהיר
            </div>
            <div className="space-y-2">
              {filteredNav.map(item => {
                const Icon = item.icon;
                return (
                  <button 
                    key={item.id}
                    onClick={() => handleSelectNav(item.id)}
                    className="w-full text-right px-5 py-4 rounded-2xl bg-white/80 backdrop-blur-sm hover:bg-white hover:shadow-lg border border-slate-200/60 hover:border-slate-300 flex items-center justify-between group transition-all duration-200"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-white border border-slate-200/60 text-slate-600 rounded-xl group-hover:bg-[color:var(--os-accent)] group-hover:border-transparent group-hover:text-white transition-all duration-200 shadow-sm">
                        <Icon size={18} />
                      </div>
                      <span className="font-bold text-slate-800 group-hover:text-slate-900">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all transform group-hover:-translate-x-1">
                      <span className="text-xs font-bold text-slate-400 uppercase">עבור</span>
                      <ArrowRight size={16} style={{ color: moduleAccent }} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {filteredLeads.length > 0 && (
          <div>
            <div className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <User size={12} /> לקוחות ולידים
            </div>
            <div className="space-y-2">
              {filteredLeads.map(lead => {
                const isHot = Boolean((lead as any)?.isHot);
                return (
                <button 
                  key={lead.id}
                  onClick={() => handleSelectLead(lead)}
                  className="w-full text-right px-5 py-4 rounded-2xl bg-white/80 backdrop-blur-sm hover:bg-white hover:shadow-lg border border-slate-200/60 hover:border-slate-300 flex items-center justify-between group transition-all duration-200"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-sm border-2 transition-all duration-200 shadow-sm ${
                      lead.status === LeadStatus.WON 
                        ? 'bg-gradient-to-br from-emerald-100 to-emerald-50 text-emerald-700 border-emerald-300/60' 
                        : 'bg-gradient-to-br from-slate-100 to-slate-50 text-slate-600 border-slate-200/60 group-hover:border-slate-300'
                    }`}>
                      {lead.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-sm mb-1">{lead.name}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-2">
                        <span>{lead.company || 'לקוח פרטי'}</span>
                        {isHot && <span className="text-amber-500 text-base">🔥</span>}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-mono font-bold text-slate-700 group-hover:text-slate-900 mb-1">
                      ₪{lead.value.toLocaleString()}
                    </div>
                    <div className={`text-xs font-bold px-2 py-1 rounded-lg ${
                      lead.status === LeadStatus.WON 
                        ? 'text-emerald-700 bg-emerald-50 border border-emerald-200/60' 
                        : 'text-slate-500 bg-slate-50 border border-slate-200/60'
                    }`}>
                      {lead.status}
                    </div>
                  </div>
                </button>
                );
              })}
            </div>
          </div>
        )}

        {query === '' && !isThinking && (
          <div className="p-12 text-center text-slate-400 relative z-10">
            <div className="w-24 h-24 bg-gradient-to-br from-slate-100 to-slate-200 rounded-3xl flex items-center justify-center mx-auto mb-6 border-2 border-slate-200/60 shadow-xl">
              <Search size={40} className="text-slate-600" />
            </div>
            <p className="text-lg font-bold text-slate-700 mb-2">חיפוש חכם במערכת</p>
            <p className="text-sm text-slate-500 mb-6">חפש לידים, ניווט מהיר, או נכסים.</p>
            <div className="flex flex-wrap gap-3 justify-center mt-4">
              <span className="px-4 py-2 bg-white/80 backdrop-blur-sm rounded-xl text-xs font-bold border shadow-sm" style={{ color: moduleAccent, borderColor: moduleAccent }}>חפש לידים</span>
              <span className="px-4 py-2 bg-white/80 backdrop-blur-sm text-emerald-700 rounded-xl text-xs font-bold border border-emerald-200/60 shadow-sm">נווט במערכת</span>
            </div>
          </div>
        )}
        
        {query !== '' && filteredNav.length === 0 && filteredLeads.length === 0 && filteredAssets.length === 0 && !isThinking && (
          <div className="p-8 text-center text-slate-400">
            <p className="text-sm font-medium mb-2">לא נמצאו תוצאות עבור "{query}"</p>
            <p className="text-xs text-slate-400">נסה לחפש משהו אחר</p>
          </div>
        )}
      </div>
      
      <div className="p-3 bg-white border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400 px-6 shrink-0">
        <div className="flex gap-4">
          <span className="flex items-center gap-1"><kbd className="bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 font-sans font-bold text-slate-500">↵</kbd> לבחירה</span>
          <span className="flex items-center gap-1"><kbd className="bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 font-sans font-bold text-slate-500">↑↓</kbd> לניווט</span>
        </div>
        <div className="flex items-center gap-1 text-slate-400 font-bold">
          <Search size={10} /> Search Mode
        </div>
      </div>
    </>
  );
}

