'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Boxes, Bug, LifeBuoy, Network, Settings } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useData } from '@/context/DataContext';
import { NexusControlPanel } from '@/components/saas/NexusControlPanel';
import { SystemOSControlPanel } from '@/components/saas/SystemOSControlPanel';
import { SupportTicketsPanel } from '@/components/saas/SupportTicketsPanel';
import { FeatureRequestsPanel } from '@/components/saas/FeatureRequestsPanel';
import SocialAdminPageClient from '../social/SocialAdminPageClient';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminTabs from '@/components/admin/AdminTabs';

type ModulesAdminTab = 'nexus' | 'system' | 'social' | 'client' | 'finance' | 'operations';

type ClientSubTab = 'support' | 'features';

export default function ModulesAdminPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { organization, updateSystemFlag, addToast } = useData();

  const [tab, setTab] = useState<ModulesAdminTab>('nexus');
  const [clientTab, setClientTab] = useState<ClientSubTab>('support');

  const safeOrg = useMemo(() => organization as any, [organization]);

  const tabs = useMemo(
    () => [
      { id: 'nexus', label: 'נקסוס', icon: Network },
      { id: 'system', label: 'סיסטם', icon: Settings },
      { id: 'social', label: 'סושיאל', icon: Boxes },
      { id: 'client', label: 'קליינט', icon: Boxes },
      { id: 'finance', label: 'פיננסים', icon: Boxes },
      { id: 'operations', label: 'תפעול', icon: Boxes },
    ],
    []
  );

  const clientTabs = useMemo(
    () => [
      { id: 'support', label: 'פניות תמיכה', icon: LifeBuoy },
      { id: 'features', label: "בקשות פיצ'רים", icon: Bug },
    ],
    []
  );

  useEffect(() => {
    try {
      const rawTab = searchParams?.get('tab');
      const rawClientTab = searchParams?.get('clientTab');

      const allowedTabs: ModulesAdminTab[] = ['nexus', 'system', 'social', 'client', 'finance', 'operations'];
      const nextTab = allowedTabs.includes(rawTab as ModulesAdminTab) ? (rawTab as ModulesAdminTab) : null;
      if (nextTab && nextTab !== tab) setTab(nextTab);

      const allowedClientTabs: ClientSubTab[] = ['support', 'features'];
      const nextClientTab = allowedClientTabs.includes(rawClientTab as ClientSubTab) ? (rawClientTab as ClientSubTab) : null;
      if (nextClientTab && nextClientTab !== clientTab) setClientTab(nextClientTab);
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const setTabAndSyncUrl = (next: ModulesAdminTab) => {
    setTab(next);
    try {
      const qs = new URLSearchParams(searchParams?.toString() || '');
      qs.set('tab', next);
      if (next !== 'client') {
        qs.delete('clientTab');
      } else {
        qs.set('clientTab', clientTab);
      }
      router.replace(`/app/admin/modules?${qs.toString()}`);
    } catch {
      // ignore
    }
  };

  const setClientTabAndSyncUrl = (next: ClientSubTab) => {
    setClientTab(next);
    if (tab !== 'client') return;
    try {
      const qs = new URLSearchParams(searchParams?.toString() || '');
      qs.set('tab', 'client');
      qs.set('clientTab', next);
      router.replace(`/app/admin/modules?${qs.toString()}`);
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-6 pb-24" dir="rtl">
      <AdminPageHeader title="שליטת מודולים" subtitle="שליטה מרכזית על המודולים במערכת" icon={Boxes} />

      <AdminTabs
        tabs={tabs as any}
        value={tab}
        onValueChange={(next) => setTabAndSyncUrl(next as ModulesAdminTab)}
        className="md:flex-wrap md:overflow-visible"
      />

      <div>
        {tab === 'nexus' ? (
          safeOrg ? (
            <NexusControlPanel organization={safeOrg} updateSystemFlag={updateSystemFlag} hideHeader />
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <div className="text-slate-900 font-black">טוען...</div>
            </div>
          )
        ) : null}

        {tab === 'system' ? (
          safeOrg ? (
            <SystemOSControlPanel organization={safeOrg} updateSystemFlag={updateSystemFlag} hideHeader />
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <div className="text-slate-900 font-black">טוען...</div>
            </div>
          )
        ) : null}

        {tab === 'client' ? (
          <div className="space-y-6">
            <AdminTabs
              tabs={clientTabs as any}
              value={clientTab}
              onValueChange={(next) => setClientTabAndSyncUrl(next as ClientSubTab)}
              className="md:flex-wrap md:overflow-visible"
            />

            {clientTab === 'support' ? <SupportTicketsPanel addToast={addToast} /> : null}
            {clientTab === 'features' ? <FeatureRequestsPanel addToast={addToast} /> : null}
          </div>
        ) : null}

        {tab === 'social' ? (
          <SocialAdminPageClient />
        ) : null}

        {tab === 'finance' ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <div className="text-slate-900 font-black">פיננסים</div>
            <div className="text-sm text-slate-600 mt-2">בקרת מסכים למודול פיננסים תתווסף כאן בהמשך.</div>
          </div>
        ) : null}

        {tab === 'operations' ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <div className="text-slate-900 font-black">תפעול</div>
            <div className="text-sm text-slate-600 mt-2">בקרת מסכים למודול תפעול תתווסף כאן בהמשך.</div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
