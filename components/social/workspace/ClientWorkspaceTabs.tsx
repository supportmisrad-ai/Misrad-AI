'use client';

import React from 'react';
import { LayoutGrid, Calendar as CalIcon, Inbox, ShieldCheck, Database, Zap, MessageSquare, Sparkles } from 'lucide-react';

interface ClientWorkspaceTabsProps {
  activeTab: 'overview' | 'content' | 'requests' | 'bank' | 'dna' | 'messages' | 'vault' | 'strategy';
  onTabChange: (tab: 'overview' | 'content' | 'requests' | 'bank' | 'dna' | 'messages' | 'vault' | 'strategy') => void;
}

export function ClientWorkspaceTabs({ activeTab, onTabChange }: ClientWorkspaceTabsProps) {
  const tabs = [
    { id: 'overview', label: 'סקירה', icon: LayoutGrid },
    { id: 'content', label: 'שידורים', icon: CalIcon },
    { id: 'requests', label: 'בקשות', icon: Inbox },
    { id: 'strategy', label: 'אסטרטגיה', icon: Sparkles },
    { id: 'vault', label: 'כספת גישה', icon: ShieldCheck },
    { id: 'bank', label: 'בנק תכנים', icon: Database },
    { id: 'dna', label: 'זהות', icon: Zap },
    { id: 'messages', label: 'הודעות', icon: MessageSquare }
  ] as const;

  return (
    <div className="flex bg-white p-1.5 md:p-2 rounded-2xl border border-slate-100 shadow-sm overflow-x-auto scroll-smooth no-scrollbar">
      {tabs.map(tab => (
        <button 
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`flex items-center gap-1.5 md:gap-2 px-4 md:px-6 py-2.5 md:py-3 rounded-xl font-bold text-[11px] md:text-sm transition-all whitespace-nowrap ${
            activeTab === tab.id ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <tab.icon size={16} /> {tab.label}
        </button>
      ))}
    </div>
  );
}

