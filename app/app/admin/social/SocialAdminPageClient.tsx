'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { LayoutGrid, Plug, Rocket, SlidersHorizontal, Lightbulb, Zap, Users } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { IntegrationsTab } from '@/components/saas/social/tabs/IntegrationsTab';
import { AutomationTab } from '@/components/saas/social/tabs/AutomationTab';
import { QuotasTab } from '@/components/saas/social/tabs/QuotasTab';
import { TeamTab } from '@/components/saas/social/tabs/TeamTab';
import { FeatureRequestsPanel } from '@/components/saas/FeatureRequestsPanel';
import { UpdatesTab } from '@/components/settings/UpdatesTab';
import HeavySocialAdminPanel from './components/HeavySocialAdminPanel';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminToolbar from '@/components/admin/AdminToolbar';
import AdminTabs from '@/components/admin/AdminTabs';
import type { AdminTabItem } from '@/components/admin/AdminTabs';
import type { Tenant } from '@/types';

type SocialAdminTab = 'overview' | 'team' | 'integrations' | 'quotas' | 'automation' | 'features' | 'updates' | 'advanced';

function isSocialAdminTab(value: string): value is SocialAdminTab {
  switch (value) {
    case 'overview':
    case 'team':
    case 'integrations':
    case 'quotas':
    case 'automation':
    case 'features':
    case 'updates':
    case 'advanced':
      return true;
    default:
      return false;
  }
}

export default function SocialAdminPageClient() {
  const { tenants, addToast, currentUser } = useData();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [tab, setTab] = useState<SocialAdminTab>('overview');

  const tabs = useMemo<AdminTabItem[]>(
    () => [
      { id: 'overview', label: 'מבט על', icon: LayoutGrid },
      { id: 'team', label: 'צוות', icon: Users },
      { id: 'integrations', label: 'אינטגרציות', icon: Plug },
      { id: 'quotas', label: 'מכסות', icon: SlidersHorizontal },
      { id: 'automation', label: 'אוטומציות', icon: Zap },
      { id: 'features', label: "בקשות פיצ'רים", icon: Lightbulb },
      { id: 'updates', label: 'עדכוני מערכת', icon: Rocket },
      { id: 'advanced', label: 'ניהול מתקדם', icon: Users },
    ],
    []
  );

  useEffect(() => {
    try {
      const raw = searchParams?.get('tab');
      if (!raw) return;
      const next = String(raw);
      if (isSocialAdminTab(next)) {
        setTab(next);
      }
    } catch {
      // ignore
    }
  }, [searchParams]);

  const setTabAndSyncUrl = (next: SocialAdminTab) => {
    setTab(next);
    try {
      const qs = new URLSearchParams(searchParams?.toString() || '');
      qs.set('tab', next);
      router.replace(`/app/admin/social?${qs.toString()}`);
    } catch {
      // ignore
    }
  };

  const onTabChange = (next: string) => {
    if (!isSocialAdminTab(next)) return;
    setTabAndSyncUrl(next);
  };

  const tenantOptions = useMemo<Tenant[]>(() => {
    const list: Tenant[] = Array.isArray(tenants) ? tenants : [];
    const seen = new Set<string>();
    return list.filter((t) => {
      const id = String(t.id || '');
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
      const nextId = String(first.id);
      const t = setTimeout(() => setSelectedTenantId(nextId), 0);
      return () => clearTimeout(t);
    }
  }, [selectedTenantId, tenantOptions]);

  const selectedTenant = useMemo(() => {
    return tenantOptions.find((t) => String(t.id) === String(selectedTenantId)) || null;
  }, [selectedTenantId, tenantOptions]);

  const isSuperAdmin = Boolean(currentUser?.isSuperAdmin);

  if (!isSuperAdmin) {
    return (
      <div className="bg-white/80 backdrop-blur-2xl border border-slate-200/70 rounded-3xl p-8 text-slate-900 shadow-2xl" dir="rtl">
        <h2 className="text-2xl font-black text-slate-900 mb-2">ניהול סושיאל</h2>
        <p className="text-slate-600">אין לך הרשאות לניהול מערכת סושיאל.</p>
      </div>
    );
  }

  const tenantId = selectedTenant?.id ? String(selectedTenant.id) : null;

  const showTenantSelector = tab !== 'advanced';

  return (
    <div className="space-y-6 pb-24" dir="rtl">
      <AdminPageHeader title="ניהול סושיאל" subtitle="שליטה מרכזית על הגדרות סושיאל לכל חשבון SaaS." icon={Users} />

      <AdminToolbar
        filters={
          showTenantSelector ? (
            <div className="w-full sm:w-[320px]">
              <label className="block text-xs font-black text-slate-600 mb-2">בחר משתמש</label>
              <select
                value={selectedTenantId}
                onChange={(e) => setSelectedTenantId(e.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200/60"
              >
                {tenantOptions.length === 0 ? (
                  <option value="">אין משתמשים</option>
                ) : (
                  tenantOptions.map((t) => (
                    <option key={t.id} value={String(t.id)}>
                      {t.name || t.subdomain || t.id}
                    </option>
                  ))
                )}
              </select>
            </div>
          ) : null
        }
      />

      <AdminTabs tabs={tabs} value={tab} onValueChange={onTabChange} />

      <div className="bg-white border border-slate-200 rounded-2xl p-4 md:p-6">
          {tab === 'overview' ? (
            <div className="flex flex-col gap-6">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
                <div className="text-lg font-black text-slate-900 mb-1">סטטוס כללי</div>
                <div className="text-sm text-slate-600">
                {selectedTenant
                  ? `חשבון SaaS נבחר: ${selectedTenant.name || selectedTenant.subdomain || selectedTenant.id}`
                  : 'בחר חשבון SaaS כדי לצפות בנתונים'}
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
            <div className="bg-white border border-slate-200 rounded-2xl p-4 md:p-6 text-slate-900">
              <UpdatesTab readOnly={false} />
            </div>
          ) : null}

          {tab === 'advanced' ? <HeavySocialAdminPanel /> : null}
      </div>
    </div>
  );
}
