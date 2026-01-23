'use client';

import React, { useMemo, useState } from 'react';
import { Boxes, Bug, LifeBuoy, Network, Settings } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { NexusControlPanel } from '@/components/saas/NexusControlPanel';
import { SystemOSControlPanel } from '@/components/saas/SystemOSControlPanel';
import { SupportTicketsPanel } from '@/components/saas/SupportTicketsPanel';
import { FeatureRequestsPanel } from '@/components/saas/FeatureRequestsPanel';

type ModulesAdminTab = 'nexus' | 'system' | 'client';

type ClientSubTab = 'support' | 'features';

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
          ? 'bg-indigo-50 text-indigo-700 border-indigo-100'
          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
      }`}
    >
      <Icon size={16} />
      {props.label}
    </button>
  );
}

export default function ModulesAdminPageClient() {
  const { organization, updateSystemFlag, addToast } = useData();

  const [tab, setTab] = useState<ModulesAdminTab>('nexus');
  const [clientTab, setClientTab] = useState<ClientSubTab>('support');

  const safeOrg = useMemo(() => organization as any, [organization]);

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center">
          <Boxes className="text-slate-700" size={22} />
        </div>
        <div>
          <div className="text-2xl font-black text-slate-900">שליטת מודולים</div>
          <div className="text-sm font-bold text-slate-500 mt-1">Nexus, System ו-Client — שליטה מרכזית ובקשות משתמשים</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <TabButton active={tab === 'nexus'} onClick={() => setTab('nexus')} label="Nexus" icon={Network} />
        <TabButton active={tab === 'system'} onClick={() => setTab('system')} label="System" icon={Settings} />
        <TabButton active={tab === 'client'} onClick={() => setTab('client')} label="Client" icon={Boxes} />
      </div>

      <div>
        {tab === 'nexus' ? (
          safeOrg ? (
            <NexusControlPanel organization={safeOrg} updateSystemFlag={updateSystemFlag} />
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <div className="text-slate-900 font-black">טוען...</div>
            </div>
          )
        ) : null}

        {tab === 'system' ? (
          safeOrg ? (
            <SystemOSControlPanel organization={safeOrg} updateSystemFlag={updateSystemFlag} />
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <div className="text-slate-900 font-black">טוען...</div>
            </div>
          )
        ) : null}

        {tab === 'client' ? (
          <div className="space-y-6">
            <div className="flex flex-wrap gap-2">
              <TabButton active={clientTab === 'support'} onClick={() => setClientTab('support')} label="Support Tickets" icon={LifeBuoy} />
              <TabButton active={clientTab === 'features'} onClick={() => setClientTab('features')} label="Feature Requests" icon={Bug} />
            </div>

            {clientTab === 'support' ? <SupportTicketsPanel addToast={addToast} /> : null}
            {clientTab === 'features' ? <FeatureRequestsPanel addToast={addToast} /> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
