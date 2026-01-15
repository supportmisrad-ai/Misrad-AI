import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Plug, SlidersHorizontal, Sparkles, Users } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { IntegrationsTab } from './tabs/IntegrationsTab';
import { AutomationTab } from './tabs/AutomationTab';
import { QuotasTab } from './tabs/QuotasTab';
import { TeamTab } from './tabs/TeamTab';

type SocialTabKey = 'integrations' | 'automation' | 'quotas' | 'team';

export function SocialManagementPanel() {
  const { tenants, addToast, currentUser } = useData();
  const [activeTab, setActiveTab] = useState<SocialTabKey>('integrations');

  const tenantOptions = useMemo(() => {
    const list = Array.isArray(tenants) ? tenants : [];
    const seen = new Set<string>();
    return list.filter((t: any) => {
      const id = String(t?.id || '');
      if (!id) return false;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }, [tenants]);

  const [selectedTenantId, setSelectedTenantId] = useState<string>(() => {
    const first = tenantOptions[0];
    return first?.id ? String(first.id) : '';
  });

  useEffect(() => {
    if (selectedTenantId) return;
    const first = tenantOptions[0];
    if (first?.id) {
      setSelectedTenantId(String(first.id));
    }
  }, [selectedTenantId, tenantOptions]);

  const selectedTenant = useMemo(() => {
    return tenantOptions.find((t: any) => String(t.id) === String(selectedTenantId)) || null;
  }, [selectedTenantId, tenantOptions]);

  const isSuperAdmin = Boolean(currentUser?.isSuperAdmin);

  if (!isSuperAdmin) {
    return (
      <div className="bg-white/80 backdrop-blur-2xl border border-slate-200/70 rounded-3xl p-8 text-slate-900 shadow-2xl">
        <h2 className="text-2xl font-black text-slate-900 mb-2">ניהול Social</h2>
        <p className="text-slate-600">אין לך הרשאות לניהול מערכת Social.</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2 bg-gradient-to-r from-slate-900 via-blue-700 to-indigo-700 bg-clip-text text-transparent">
              ניהול Social
            </h1>
            <p className="text-slate-600 text-lg">שליטה מרכזית על קונפיגורציית Social לכל טננט.</p>
          </div>

          <div className="min-w-[260px]">
            <label className="block text-xs font-bold text-slate-600 mb-2">בחר טננט</label>
            <select
              value={selectedTenantId}
              onChange={(e) => setSelectedTenantId(e.target.value)}
              className="w-full bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl py-2.5 px-4 text-sm text-slate-900 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-200/60 transition-all appearance-none cursor-pointer"
            >
              {tenantOptions.length === 0 ? (
                <option value="">אין טננטים</option>
              ) : (
                tenantOptions.map((t: any) => (
                  <option key={t.id} value={String(t.id)}>
                    {t.name || t.slug || t.id}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white/70 backdrop-blur-2xl border border-slate-200/70 rounded-3xl shadow-2xl overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 px-6 py-5 border-b border-slate-200/70">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('integrations')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black transition-colors border ${
                activeTab === 'integrations'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white/70 text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
              type="button"
            >
              <Plug size={16} /> אינטגרציות
            </button>
            <button
              onClick={() => setActiveTab('automation')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black transition-colors border ${
                activeTab === 'automation'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white/70 text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
              type="button"
            >
              <Sparkles size={16} /> אוטומציות
            </button>
            <button
              onClick={() => setActiveTab('quotas')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black transition-colors border ${
                activeTab === 'quotas'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white/70 text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
              type="button"
            >
              <SlidersHorizontal size={16} /> מכסות
            </button>
            <button
              onClick={() => setActiveTab('team')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black transition-colors border ${
                activeTab === 'team'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white/70 text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
              type="button"
            >
              <Users size={16} /> צוות
            </button>
          </div>

          <div className="text-xs font-bold text-slate-500">
            {selectedTenant ? `טננט: ${selectedTenant.name || selectedTenant.slug || selectedTenant.id}` : 'בחר טננט'}
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'integrations' ? (
            <IntegrationsTab tenantId={selectedTenant?.id ? String(selectedTenant.id) : null} addToast={addToast} />
          ) : null}

          {activeTab === 'automation' ? (
            <AutomationTab tenantId={selectedTenant?.id ? String(selectedTenant.id) : null} addToast={addToast} />
          ) : null}

          {activeTab === 'quotas' ? (
            <QuotasTab tenantId={selectedTenant?.id ? String(selectedTenant.id) : null} addToast={addToast} />
          ) : null}

          {activeTab === 'team' ? (
            <TeamTab tenantId={selectedTenant?.id ? String(selectedTenant.id) : null} addToast={addToast} />
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}
