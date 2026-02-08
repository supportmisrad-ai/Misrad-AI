'use client';

import React, { useState, useEffect } from 'react';
import { type Activity, type Task, WebhookLog, Lead, FieldAgent } from './types';
import { Settings, Webhook, Sparkles } from 'lucide-react';
import IntegrationsView from './IntegrationsView';
import AIAnalyticsView from './AIAnalyticsView';
import { useAuth } from './contexts/AuthContext';
import GlobalProfileHub from '@/components/profile/GlobalProfileHub';

interface SystemHubProps {
    logs: WebhookLog[];
    leads: Lead[];
    agents: FieldAgent[];
    onAddTask?: (task: Task) => void;
    onAddActivity?: (leadId: string, activity: Activity) => void;
}

const SystemHub: React.FC<SystemHubProps> = ({ logs, leads, agents, onAddTask, onAddActivity }) => {
  const { canAccess } = useAuth();
  const [activeTab, setActiveTab] = useState('analytics');

  const TABS = [
      { id: 'analytics', label: 'ניתוח נתונים חכם', icon: Sparkles, allowed: true },
      { id: 'integrations', label: 'חיבורים ו-API', icon: Webhook, allowed: canAccess('integrations_config') },
      { id: 'settings', label: 'הגדרות מערכת', icon: Settings, allowed: true },
  ].filter(t => t.allowed);

  // Ensure active tab is valid
  useEffect(() => {
      if (!TABS.find(t => t.id === activeTab)) {
          setActiveTab(TABS[0]?.id || 'analytics');
      }
  }, [TABS, activeTab]);

  return (
    <div className="h-full flex flex-col">
        {/* Sub-Navigation */}
        <div className="bg-white border-b border-slate-200 px-4 md:px-8 py-2 sticky top-0 z-30 shadow-sm">
            <div className="max-w-[1920px] mx-auto flex gap-6 overflow-x-auto no-scrollbar">
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 py-3 px-1 border-b-2 transition-all whitespace-nowrap text-base font-bold ${
                            activeTab === tab.id 
                            ? 'border-primary text-primary' 
                            : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        <tab.icon size={18} />
                        {tab.label}
                    </button>
                ))}
            </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
            {activeTab === 'analytics' && <AIAnalyticsView leads={leads} />}
            {activeTab === 'integrations' && canAccess('integrations_config') && <IntegrationsView logs={logs} />}
            {activeTab === 'settings' && <GlobalProfileHub defaultOrigin="system" defaultDrawer="system" />}
        </div>
    </div>
  );
};

export default SystemHub;
