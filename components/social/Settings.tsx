'use client';

import React from 'react';
import { Shield, Globe, Tag, Zap, Bot, Users, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { useApp } from '@/contexts/AppContext';
import PricingTab from './settings/PricingTab';
import AutomationTab from './settings/AutomationTab';
import SocialConnectionsTab from './settings/SocialConnectionsTab';
import SecurityTab from './settings/SecurityTab';
import TeamSettingsTab from './settings/TeamSettingsTab';
import IntegrationsTab from './settings/IntegrationsTab';
import UpdatesTab from './settings/UpdatesTab';

const SETTINGS_ITEMS = [
  { id: 'updates', label: 'עדכונים', desc: 'עדכוני אפליקציה ושינויים', icon: Sparkles },
  { id: 'pricing', label: 'שירותים ומחירון', desc: 'נהל פלטפורמות ומרקטפלייס', icon: Tag },
  { id: 'team_management', label: 'ניהול הרשאות וצוות', desc: 'הגדרת תפקידים וצירף עובדים', icon: Users },
  { id: 'integrations', label: 'אינטגרציות', desc: 'חיבור למורנינג, Make ו-Zapier', icon: Zap },
  { id: 'automation', label: 'אוטומציות וגבייה', desc: 'תזכורות תשלום ו-API', icon: Bot },
  { id: 'security', label: 'אבטחה וסיסמה', desc: 'אימות וסיסמאות', icon: Shield },
  { id: 'social', label: 'חיבורי רשתות', desc: 'ניהול API של פלטפורמות', icon: Globe },
];

export default function Settings() {
  const {
    settingsSubView,
    setSettingsSubView,
    platformConfigs,
    setPlatformConfigs,
    marketplaceAddons,
    setMarketplaceAddons,
    isTeamManagementEnabled,
    setIsTeamManagementEnabled,
    team,
    addToast,
  } = useApp();

  const navItems = isTeamManagementEnabled
    ? SETTINGS_ITEMS
    : SETTINGS_ITEMS.filter((item) => item.id !== 'team_management');

  // Set default view if none is selected or if it's 'main'
  const activeView =
    settingsSubView === 'main' || !settingsSubView || settingsSubView === 'infrastructure'
      ? 'integrations'
      : settingsSubView;

  const renderContent = () => {
    switch (activeView) {
      case 'updates':
        return <UpdatesTab onNotify={addToast} />;
      case 'integrations':
        return <IntegrationsTab onNotify={addToast} />;
      case 'pricing':
        return (
          <PricingTab
            platformConfigs={platformConfigs}
            setPlatformConfigs={setPlatformConfigs}
            marketplaceAddons={marketplaceAddons}
            setMarketplaceAddons={setMarketplaceAddons}
            onNotify={addToast}
          />
        );
      case 'automation':
        return <AutomationTab />;
      case 'social':
        return <SocialConnectionsTab />;
      case 'security':
        return <SecurityTab onNotify={addToast} />;
      case 'team_management':
        if (!isTeamManagementEnabled) {
          return <IntegrationsTab onNotify={addToast} />;
        }
        return (
          <TeamSettingsTab
            onNotify={addToast}
            isEnabled={isTeamManagementEnabled}
            setIsEnabled={setIsTeamManagementEnabled}
            team={team}
          />
        );
      default:
        return <IntegrationsTab onNotify={addToast} />;
    }
  };

  return (
    <div className="w-full pb-20" dir="rtl">
      <div className="flex flex-col lg:flex-row lg:items-start gap-8 relative">
        {/* Sidebar Navigation - Fixed Position */}
        <aside className="lg:w-80 shrink-0 lg:self-start">
          <div className="bg-white rounded-[48px] border border-slate-200 shadow-xl overflow-hidden lg:sticky lg:top-24 lg:self-start lg:max-h-[calc(100vh-7rem)] flex flex-col">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-2xl font-black text-slate-800">הגדרות מערכת</h2>
            </div>
            <nav className="flex flex-col flex-1 overflow-y-auto">
              {navItems.map((item, index) => {
                const Icon = item.icon;
                const isActive = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setSettingsSubView(item.id as any)}
                    className={`w-full flex items-center gap-4 p-6 text-right transition-all border-b border-slate-100 last:border-0 group border-r-4 ${
                      isActive
                        ? 'bg-blue-50 text-blue-600 border-r-blue-600'
                        : 'hover:bg-slate-50 text-slate-600 border-r-transparent'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all shrink-0 ${
                      isActive 
                        ? 'bg-blue-600 text-white shadow-lg' 
                        : 'bg-slate-100 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600'
                    }`}>
                      <Icon size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-black text-sm ${isActive ? 'text-blue-600' : 'text-slate-800'}`}>
                        {item.label}
                      </p>
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          <motion.div
            key={activeView}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {renderContent()}
          </motion.div>
        </main>
      </div>
    </div>
  );
}

