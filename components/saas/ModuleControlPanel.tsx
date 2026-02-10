'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { SYSTEM_SCREENS } from '../../constants';
import { OrganizationProfile, SystemScreenStatus } from '../../types';

type ModuleKey = 'nexus' | 'social' | 'system' | 'finance' | 'client' | 'operations';

interface ModuleControlPanelProps {
  moduleKey: ModuleKey;
  organization: OrganizationProfile;
  updateSystemFlag: (screenId: string, status: SystemScreenStatus) => void;
  hideHeader?: boolean;
}

const MODULE_SCREENS: Record<ModuleKey, string[]> = {
  nexus: ['dashboard', 'nexus_tasks', 'nexus_projects', 'nexus_team', 'nexus_calendar', 'nexus_reports', 'nexus_settings'],
  social: ['social_dashboard', 'social_posts', 'social_calendar', 'social_analytics', 'social_settings'],
  system: ['system_dashboard', 'system_leads', 'system_pipeline', 'system_clients', 'system_reports', 'system_settings'],
  finance: ['finance_dashboard', 'finance_invoices', 'finance_expenses', 'finance_reports', 'finance_settings'],
  client: ['client_dashboard', 'client_clients', 'client_sessions', 'client_calendar', 'client_reports', 'client_settings'],
  operations: ['operations_dashboard', 'operations_tasks', 'operations_team', 'operations_resources', 'operations_reports', 'operations_settings'],
};

const MODULE_LABELS: Record<ModuleKey, string> = {
  nexus: 'Nexus',
  social: 'Social',
  system: 'System',
  finance: 'Finance',
  client: 'Client',
  operations: 'Operations',
};

export const ModuleControlPanel: React.FC<ModuleControlPanelProps> = ({ 
  moduleKey, 
  organization, 
  updateSystemFlag, 
  hideHeader 
}) => {
  const moduleScreenIds = MODULE_SCREENS[moduleKey] || [];
  const moduleScreens = SYSTEM_SCREENS.filter(screen => moduleScreenIds.includes(screen.id));
  const moduleLabel = MODULE_LABELS[moduleKey];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle2 size={20} className="text-emerald-600" />;
      case 'maintenance':
        return <AlertTriangle size={20} className="text-amber-600" />;
      case 'hidden':
        return <XCircle size={20} className="text-slate-400" />;
      default:
        return <CheckCircle2 size={20} className="text-emerald-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            פעיל
          </span>
        );
      case 'maintenance':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold rounded-full bg-amber-50 text-amber-700 border border-amber-200">
            תחזוקה
          </span>
        );
      case 'hidden':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold rounded-full bg-slate-50 text-slate-600 border border-slate-200">
            מוסתר
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      {!hideHeader ? (
        <div className="mb-8">
          <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2 bg-gradient-to-r from-slate-900 via-indigo-700 to-purple-700 bg-clip-text text-transparent">
            בקרת {moduleLabel}
          </h1>
          <p className="text-slate-600 text-lg">שליטה על סטטוס כל מסך במודול (פעיל / תחזוקה / מוסתר)</p>
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {moduleScreens.map(screen => {
          const currentFlag = organization.systemFlags?.[screen.id] || 'active';
          
          return (
            <div key={screen.id} className="bg-white/70 backdrop-blur-2xl border border-slate-200/70 p-6 rounded-2xl hover:bg-white/90 hover:border-slate-300/80 transition-all shadow-xl">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="text-lg font-black text-slate-900 mb-1">{screen.label}</div>
                  <div className="text-sm text-slate-600">{screen.description}</div>
                </div>
                {getStatusIcon(currentFlag)}
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => updateSystemFlag(screen.id, 'active')}
                  className={`flex-1 px-3 py-2 text-xs font-bold rounded-xl transition-all ${
                    currentFlag === 'active'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
                  }`}
                >
                  פעיל
                </button>
                <button
                  onClick={() => updateSystemFlag(screen.id, 'maintenance')}
                  className={`flex-1 px-3 py-2 text-xs font-bold rounded-xl transition-all ${
                    currentFlag === 'maintenance'
                      ? 'bg-amber-600 text-white shadow-md'
                      : 'bg-slate-100 text-slate-600 hover:bg-amber-50 hover:text-amber-700'
                  }`}
                >
                  תחזוקה
                </button>
                <button
                  onClick={() => updateSystemFlag(screen.id, 'hidden')}
                  className={`flex-1 px-3 py-2 text-xs font-bold rounded-xl transition-all ${
                    currentFlag === 'hidden'
                      ? 'bg-slate-600 text-white shadow-md'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  מוסתר
                </button>
              </div>

              <div className="mt-3">
                {getStatusBadge(currentFlag)}
              </div>
            </div>
          );
        })}
      </div>

      {moduleScreens.length === 0 ? (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 text-center">
          <p className="text-blue-900 font-bold">
            אין מסכים מוגדרים למודול {moduleLabel} עדיין.
          </p>
        </div>
      ) : null}
    </motion.div>
  );
};
