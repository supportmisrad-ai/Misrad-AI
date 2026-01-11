
import React, { useState, useEffect } from 'react';
import { WebhookLog, Lead, FieldAgent } from '../types';
import { Settings, Bot, Webhook, BrainCircuit } from 'lucide-react';
import SettingsView from './SettingsView';
import AutomationsView from './AutomationsView';
import IntegrationsView from './IntegrationsView';
import AIAnalyticsView from './AIAnalyticsView';
import { useAuth } from '../contexts/AuthContext';

interface SystemHubProps {
    logs: WebhookLog[];
    leads: Lead[];
    agents: FieldAgent[];
}

const SystemHub: React.FC<SystemHubProps> = ({ logs, leads, agents }) => {
  const { canAccess } = useAuth();
  const [activeTab, setActiveTab] = useState('analytics');

  const TABS = [
      { id: 'analytics', label: 'ניתוח נתונים חכם', icon: BrainCircuit, allowed: true },
      { id: 'automations', label: 'אוטומציות', icon: Bot, allowed: true },
      { id: 'integrations', label: 'חיבורים ו-API', icon: Webhook, allowed: canAccess('integrations_config') },
      { id: 'settings', label: 'הגדרות מערכת', icon: Settings, allowed: true },
  ].filter(t => t.allowed);

  // Ensure active tab is valid
  useEffect(() => {
      if (!TABS.find(t => t.id === activeTab)) {
          setActiveTab(TABS[0].id);
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
            {activeTab === 'analytics' && <AIAnalyticsView leads={leads} agents={agents} />}
            {activeTab === 'automations' && <AutomationsView />}
            {activeTab === 'integrations' && canAccess('integrations_config') && <IntegrationsView logs={logs} />}
            {activeTab === 'settings' && <SettingsView leads={leads} />}
        </div>
    </div>
  );
};

export default SystemHub;
