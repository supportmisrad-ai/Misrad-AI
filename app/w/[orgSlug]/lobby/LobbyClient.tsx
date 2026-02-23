'use client';

import React, { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAIModuleChat } from '@/components/command-palette/useAIModuleChat';
import { CommandPaletteChat } from '@/components/command-palette/CommandPaletteChat';
import NexusCard from '@/components/shared/NexusCard';
import NexusMasterLayout from '@/components/shared/NexusMasterLayout';
import { LockedModuleUpgradeModal } from '@/components/shared/LockedModuleUpgradeModal';
import type { OSModuleKey } from '@/lib/os/modules/types';
import { modulesRegistry } from '@/lib/os/modules/registry';
import { OSModuleIcon } from '@/components/shared/OSModuleIcon';
import { asObject } from '@/lib/shared/unknown';

function toMetricValue(value: unknown): string | number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const s = value.trim();
    if (!s) return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : s;
  }
  if (typeof value === 'boolean') return value ? 1 : 0;
  return null;
}

const GLOBAL_STARTERS = [
  {
    id: 'global-1',
    text: 'תן לי תמונת מצב עסקית של כל המודולים להיום'.trim(),
  },
  {
    id: 'global-2',
    text: 'איפה הצוואר בקבוק המרכזי שלי כרגע (לידים/גבייה/שירות)?'.trim(),
  },
  {
    id: 'global-3',
    text: 'מהי הפעולה הכי דחופה שאני צריך לבצע עכשיו?'.trim(),
  },
];

export default function LobbyClient({
  orgSlug,
  workspace,
  user,
  entitlements,
  kpis,
}: {
  orgSlug: string;
  workspace: { name: string; logoUrl?: string | null };
  user: { name: string; role?: string | null; avatarUrl?: string | null };
  entitlements: Record<OSModuleKey, boolean>;
  kpis: unknown;
}) {
  const router = useRouter();
  const [locked, setLocked] = useState<OSModuleKey | null>(null);

  const { messages, isLoading, error, sendText } = useAIModuleChat({
    moduleOverride: 'global',
    orgSlugOverride: orgSlug,
    context: { page: 'lobby' },
  });

  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null!);
  const messagesEndRef = useRef<HTMLDivElement>(null!);

  const handleSendMessage = () => {
    const trimmed = String(query || '').trim();
    if (!trimmed || isLoading) return;
    sendText(trimmed);
    setQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const profileHref = useMemo(() => `/w/${encodeURIComponent(orgSlug)}/nexus/me`, [orgSlug]);

  const openModule = (module: OSModuleKey) => {
    if (module !== 'nexus' && !entitlements[module]) {
      setLocked(module);
      return;
    }
    router.push(`/w/${encodeURIComponent(orgSlug)}/${module}`);
  };

  const kpisObj = asObject(kpis) ?? {};
  const systemObj = asObject(kpisObj.system) ?? {};
  const socialObj = asObject(kpisObj.social) ?? {};
  const financeObj = asObject(kpisObj.finance) ?? {};
  const clientObj = asObject(kpisObj.client) ?? {};
  const operationsObj = asObject(kpisObj.operations) ?? {};

  const systemMetric = toMetricValue(systemObj.leadsTotal);
  const socialMetric = toMetricValue(socialObj.postsScheduled) ?? toMetricValue(socialObj.postsTotal);
  const financeMetric = toMetricValue(financeObj.totalHours) ?? toMetricValue(financeObj.totalMinutes);
  const clientMetric = toMetricValue(clientObj.clientsTotal);
  const operationsMetric = toMetricValue(operationsObj.activeProjects);

  const globalChatGradient = 'from-slate-900 via-slate-800 to-slate-900';
  const globalChatAccent = '#0f172a';

  return (
    <NexusMasterLayout title="לובי" workspace={workspace} user={user} profileHref={profileHref}>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="text-[10px] font-black tracking-[0.3em] text-slate-400 uppercase">Lobby</div>
          <h1 className="text-3xl font-black text-slate-900 mt-2">{workspace.name}</h1>
          <p className="text-sm text-slate-600 mt-2">מרכז שליטה שמחבר את כל המודולים יחד</p>
        </div>
      </div>

      <div className="mt-10">
        <div className="text-sm font-black text-slate-700 mb-4">Power Tiles</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <NexusCard
            title={modulesRegistry.nexus.label}
            subtitle={modulesRegistry.nexus.labelHe}
            iconSlot={<OSModuleIcon moduleKey="nexus" size={44} className="block" />}
            metric={null}
            metricLabel={null}
            onClickAction={() => openModule('nexus')}
            className="min-h-[132px]"
          />

          <NexusCard
            title={modulesRegistry.system.label}
            subtitle={modulesRegistry.system.labelHe}
            iconSlot={<OSModuleIcon moduleKey="system" size={44} className="block" />}
            metric={systemMetric}
            metricLabel="לידים"
            onClickAction={() => openModule('system')}
            className="min-h-[132px]"
            locked={!entitlements.system}
          />

          <NexusCard
            title={modulesRegistry.operations.label}
            subtitle={modulesRegistry.operations.labelHe}
            iconSlot={<OSModuleIcon moduleKey="operations" size={44} className="block" />}
            metric={operationsMetric}
            metricLabel={!entitlements.operations ? 'נעול' : 'פרויקטים'}
            onClickAction={() => openModule('operations')}
            className="min-h-[132px]"
            locked={!entitlements.operations}
          />

          <NexusCard
            title={modulesRegistry.finance.label}
            subtitle={modulesRegistry.finance.labelHe}
            iconSlot={<OSModuleIcon moduleKey="finance" size={44} className="block" />}
            metric={financeMetric}
            metricLabel={!entitlements.finance ? 'נעול' : 'שעות'}
            onClickAction={() => openModule('finance')}
            className="min-h-[132px]"
            locked={!entitlements.finance}
          />

          <NexusCard
            title={modulesRegistry.client.label}
            subtitle={modulesRegistry.client.labelHe}
            iconSlot={<OSModuleIcon moduleKey="client" size={44} className="block" />}
            metric={clientMetric}
            metricLabel={!entitlements.client ? 'נעול' : 'לקוחות'}
            onClickAction={() => openModule('client')}
            className="min-h-[132px]"
            locked={!entitlements.client}
          />

          <NexusCard
            title={modulesRegistry.social.label}
            subtitle={modulesRegistry.social.labelHe}
            iconSlot={<OSModuleIcon moduleKey="social" size={44} className="block" />}
            metric={socialMetric}
            metricLabel={!entitlements.social ? 'נעול' : 'מתוזמנים'}
            onClickAction={() => openModule('social')}
            className="min-h-[132px]"
            locked={!entitlements.social}
          />
        </div>
      </div>

      <div className="mt-10">
        <div className="text-sm font-black text-slate-700 mb-4">Global AI</div>
        <div className="bg-white rounded-[1.5rem] border border-gray-200/80 shadow-sm overflow-hidden h-[520px]">
          <CommandPaletteChat
            query={query}
            setQuery={setQuery}
            messages={messages}
            isThinking={isLoading}
            error={error}
            messagesEndRef={messagesEndRef}
            inputRef={inputRef}
            extractMessageText={(m: unknown) => {
              const obj = asObject(m);
              const content = obj?.content;
              return typeof content === 'string' ? content : '';
            }}
            handleSendMessage={handleSendMessage}
            sendText={(text: string) => sendText(text)}
            starters={GLOBAL_STARTERS}
            onKeyDown={handleKeyDown}
            moduleGradient={globalChatGradient}
            moduleAccent={globalChatAccent}
            moduleKey="global"
            orgSlug={orgSlug}
          />
        </div>
      </div>

      <LockedModuleUpgradeModal module={locked} onCloseAction={() => setLocked(null)} />
    </NexusMasterLayout>
  );
}
