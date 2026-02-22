'use client';

import React from 'react';
import { Search, Link, Copy, Send, LayoutGrid, ArrowRight, User } from 'lucide-react';
import { Lead, LeadStatus } from '@/types';
import { useData } from '@/context/DataContext';
import { Skeleton } from '@/components/ui/skeletons';
import type { CommandPaletteNavItem, CommandPaletteQuickAsset } from './command-palette.types';
import { asObject } from '@/lib/shared/unknown';

interface CommandPaletteSearchProps {
  query: string;
  setQuery: (query: string) => void;
  isThinking: boolean;
  inputRef: React.RefObject<HTMLInputElement>;
  onKeyDown: (e: React.KeyboardEvent) => void;
  filteredNav: CommandPaletteNavItem[];
  filteredLeads: Lead[];
  filteredAssets: CommandPaletteQuickAsset[];
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
      <div className="flex items-center gap-2.5 px-3 py-2.5 border-b border-slate-100 shrink-0">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors text-slate-400" size={16} style={isThinking ? { color: moduleAccent } : undefined} />
          <input 
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="text" 
            placeholder="חפש דף, פעולה או מודול..."
            className="w-full pr-9 pl-3 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-sm focus:outline-none focus:border-slate-300 focus:ring-1 focus:ring-slate-200/60 text-slate-800 placeholder:text-slate-400 font-medium transition-all duration-150"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
          />
          {isThinking && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <Skeleton className="w-1.5 h-1.5 rounded-full" />
              <Skeleton className="w-1.5 h-1.5 rounded-full" />
              <Skeleton className="w-1.5 h-1.5 rounded-full" />
            </div>
          )}
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
                <div 
                  key={asset.id}
                  className="w-full text-right px-3 py-2.5 rounded-xl hover:bg-slate-50 flex items-center justify-between group transition-colors duration-150"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-slate-100 rounded-lg" style={{ color: moduleAccent }}>
                      <Link size={14} />
                    </div>
                    <span className="font-bold text-sm text-slate-700">{asset.label}</span>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button 
                      onClick={() => handleCopyAsset(asset.value, asset.type)}
                      className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                      title="העתק"
                    >
                      <Copy size={14} />
                    </button>
                    <button 
                      onClick={() => handleWhatsappAsset(asset.value)}
                      className="p-1.5 hover:bg-emerald-50 rounded-lg text-emerald-500 hover:text-emerald-600 transition-colors"
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

        {filteredNav.length > 0 && (
          <div className="mb-1">
            <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <LayoutGrid size={10} /> ניווט מהיר
            </div>
            <div className="space-y-0.5">
              {filteredNav.map(item => {
                const Icon = item.icon;
                return (
                  <button 
                    key={item.id}
                    onClick={() => handleSelectNav(item.id)}
                    className="w-full text-right px-3 py-2.5 rounded-xl hover:bg-slate-50 flex items-center justify-between group transition-colors duration-150"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 bg-slate-50 border border-slate-200/60 text-slate-500 rounded-lg group-hover:text-white transition-all duration-150" style={{ '--hover-bg': moduleAccent } as React.CSSProperties} onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = moduleAccent; (e.currentTarget as HTMLElement).style.borderColor = 'transparent'; }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = ''; (e.currentTarget as HTMLElement).style.borderColor = ''; }}>
                        <Icon size={15} />
                      </div>
                      <span className="font-bold text-sm text-slate-700 group-hover:text-slate-900">{item.label}</span>
                    </div>
                    <ArrowRight size={14} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-all group-hover:-translate-x-0.5" style={{ color: moduleAccent }} />
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
              {filteredLeads.map(lead => {
                const isHot = Boolean(asObject(lead)?.isHot);
                return (
                <button 
                  key={lead.id}
                  onClick={() => handleSelectLead(lead)}
                  className="w-full text-right px-3 py-2.5 rounded-xl hover:bg-slate-50 flex items-center justify-between group transition-colors duration-150"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs border transition-colors ${
                      lead.status === LeadStatus.WON 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                        : 'bg-slate-50 text-slate-600 border-slate-200 group-hover:border-slate-300'
                    }`}>
                      {lead.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-slate-800 text-sm">{lead.name}</div>
                      <div className="text-xs text-slate-400 flex items-center gap-1.5">
                        <span>{lead.company || 'לקוח פרטי'}</span>
                        {isHot && <span className="text-amber-500">🔥</span>}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-mono font-bold text-slate-600 group-hover:text-slate-800">
                      ₪{lead.value.toLocaleString()}
                    </div>
                    <div className={`text-[10px] font-bold ${
                      lead.status === LeadStatus.WON ? 'text-emerald-600' : 'text-slate-400'
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
          <div className="py-8 px-4 text-center text-slate-400">
            <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-slate-200/60">
              <Search size={24} className="text-slate-400" />
            </div>
            <p className="text-sm font-bold text-slate-600 mb-1">חיפוש חכם במערכת</p>
            <p className="text-xs text-slate-400 mb-4">חפש דף, נווט, או שאל שאלה.</p>
            <div className="flex flex-wrap gap-2 justify-center">
              <span className="px-3 py-1.5 bg-white rounded-lg text-[11px] font-bold border" style={{ color: moduleAccent, borderColor: moduleAccent + '40' }}>חפש לידים</span>
              <span className="px-3 py-1.5 bg-white text-emerald-600 rounded-lg text-[11px] font-bold border border-emerald-200/60">נווט במערכת</span>
            </div>
          </div>
        )}
        
        {query !== '' && filteredNav.length === 0 && filteredLeads.length === 0 && filteredAssets.length === 0 && !isThinking && (
          <div className="py-6 px-4 text-center text-slate-400">
            <p className="text-sm font-medium mb-1">לא נמצאו תוצאות עבור “{query}”</p>
            <p className="text-xs text-slate-400">נסה לחפש משהו אחר</p>
          </div>
        )}
      </div>
      
      <div className="px-3 py-2 bg-slate-50/80 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400 shrink-0">
        <div className="flex gap-3">
          <span className="flex items-center gap-1"><kbd className="bg-white border border-slate-200 rounded px-1 py-0.5 font-sans font-bold text-slate-500 text-[9px]">↵</kbd> לבחירה</span>
          <span className="flex items-center gap-1"><kbd className="bg-white border border-slate-200 rounded px-1 py-0.5 font-sans font-bold text-slate-500 text-[9px]">↑↓</kbd> לניווט</span>
        </div>
        <div className="flex items-center gap-1 text-slate-400 font-bold">
          <Search size={9} /> מצב חיפוש
        </div>
      </div>
    </>
  );
}

