'use client';

import React from 'react';
import { LayoutGrid, Calendar as CalIcon, Inbox, ShieldCheck, Database, BrainCircuit, MessageSquare } from 'lucide-react';

interface ClientWorkspaceTabsProps {
  activeTab: 'overview' | 'content' | 'requests' | 'bank' | 'dna' | 'messages' | 'vault';
  onTabChange: (tab: 'overview' | 'content' | 'requests' | 'bank' | 'dna' | 'messages' | 'vault') => void;
}

export function ClientWorkspaceTabs({ activeTab, onTabChange }: ClientWorkspaceTabsProps) {
  const tabs = [
    { id: 'overview', label: 'סקירה', icon: LayoutGrid },
    { id: 'content', label: 'שידורים', icon: CalIcon },
    { id: 'requests', label: 'בקשות', icon: Inbox },
    { id: 'vault', label: 'כספת גישה', icon: ShieldCheck },
    { id: 'bank', label: 'בנק תכנים', icon: Database },
    { id: 'dna', label: 'זהות', icon: BrainCircuit },
    { id: 'messages', label: 'הודעות', icon: MessageSquare }
  ] as const;

  return (
    <div className="flex bg-white p-2 rounded-2xl md:rounded-[28px] border border-slate-200 shadow-sm overflow-x-auto scroll-smooth">
      {tabs.map(tab => (
        <button 
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`flex items-center gap-2 md:gap-3 px-5 md:px-8 py-3 md:py-4 rounded-xl md:rounded-[22px] font-black text-[11px] md:text-sm transition-all whitespace-nowrap ${
            activeTab === tab.id ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-400 hover:bg-slate-50'
          }`}
        >
          <tab.icon size={16} /> {tab.label}
        </button>
      ))}
    </div>
  );
}

