'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { LayoutGrid, Plug, Rocket, SlidersHorizontal, Sparkles, Users } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { IntegrationsTab } from '@/components/saas/social/tabs/IntegrationsTab';
import { AutomationTab } from '@/components/saas/social/tabs/AutomationTab';
import { QuotasTab } from '@/components/saas/social/tabs/QuotasTab';
import { TeamTab } from '@/components/saas/social/tabs/TeamTab';
import { FeatureRequestsPanel } from '@/components/saas/FeatureRequestsPanel';
import { UpdatesTab } from '@/components/settings/UpdatesTab';

type SocialAdminTab = 'overview' | 'team' | 'integrations' | 'quotas' | 'automation' | 'features' | 'updates';

function TabButton(props: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ElementType;
}) {
  const Icon = props.icon;
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black transition-colors border ${
        props.active
          ? 'bg-blue-600 text-white border-blue-600'
          : 'bg-white/70 text-slate-700 border-slate-200 hover:bg-slate-50'
      }`}
    >
      <Icon size={16} />
      {props.label}
    </button>
  );
}

export default function SocialAdminPageClient() {
  const { tenants, addToast, currentUser } = useData();

  const [tab, setTab] = useState<SocialAdminTab>('overview');

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
      <div className="bg-white/80 backdrop-blur-2xl border border-slate-200/70 rounded-3xl p-8 text-slate-900 shadow-2xl" dir="rtl">
        <h2 className="text-2xl font-black text-slate-900 mb-2">ניהול Social</h2>
        <p className="text-slate-600">אין לך הרשאות לניהול מערכת Social.</p>
      </div>
    );
  }

  const tenantId = selectedTenant?.id ? String(selectedTenant.id) : null;

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        <div>
          <div className="text-2xl font-black text-slate-900">
            {tab === 'overview'
              ? 'Social · מבט על'
              : tab === 'team'
                ? 'Social · צוות'
                : tab === 'integrations'
                  ? 'Social · אינטגרציות'
                  : tab === 'quotas'
                    ? 'Social · מכסות'
                    : tab === 'automation'
                      ? 'Social · אוטומציות'
                      : tab === 'features'
                        ? "Social · בקשות פיצ'רים"
                        : 'Social · עדכוני מערכת'}
          </div>
          <div className="text-sm font-bold text-slate-500 mt-1">שליטה מרכזית על קונפיגורציית Social לכל טננט.</div>
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

      <div className="flex flex-wrap gap-2">
        <TabButton active={tab === 'overview'} onClick={() => setTab('overview')} label="מבט על" icon={LayoutGrid} />
        <TabButton active={tab === 'team'} onClick={() => setTab('team')} label="צוות" icon={Users} />
        <TabButton active={tab === 'integrations'} onClick={() => setTab('integrations')} label="אינטגרציות" icon={Plug} />
        <TabButton active={tab === 'quotas'} onClick={() => setTab('quotas')} label="מכסות" icon={SlidersHorizontal} />
        <TabButton active={tab === 'automation'} onClick={() => setTab('automation')} label="אוטומציות" icon={Sparkles} />
        <TabButton active={tab === 'features'} onClick={() => setTab('features')} label="בקשות פיצ'רים" icon={Sparkles} />
        <TabButton active={tab === 'updates'} onClick={() => setTab('updates')} label="עדכוני מערכת" icon={Rocket} />
      </div>

      <div className="bg-white/70 backdrop-blur-2xl border border-slate-200/70 rounded-3xl shadow-2xl overflow-hidden">
        <div className="p-6">
          {tab === 'overview' ? (
            <div className="flex flex-col gap-6">
              <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl p-6 shadow-sm">
                <div className="text-lg font-black text-slate-900 mb-1">סטטוס כללי</div>
                <div className="text-sm text-slate-600">
                  {selectedTenant
                    ? `טננט נבחר: ${selectedTenant.name || selectedTenant.slug || selectedTenant.id}`
                    : 'בחר טננט כדי לצפות בנתונים'}
                </div>
              </div>
              <IntegrationsTab tenantId={tenantId} addToast={addToast} />
            </div>
          ) : null}

          {tab === 'team' ? <TeamTab tenantId={tenantId} addToast={addToast} /> : null}

          {tab === 'integrations' ? <IntegrationsTab tenantId={tenantId} addToast={addToast} /> : null}

          {tab === 'quotas' ? <QuotasTab tenantId={tenantId} addToast={addToast} /> : null}

          {tab === 'automation' ? <AutomationTab tenantId={tenantId} addToast={addToast} /> : null}

          {tab === 'features' ? <FeatureRequestsPanel addToast={addToast} /> : null}

          {tab === 'updates' ? (
            <div className="bg-white/80 backdrop-blur-2xl border border-slate-200/70 rounded-3xl p-8 text-slate-900 shadow-2xl">
              <UpdatesTab readOnly={false} />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
