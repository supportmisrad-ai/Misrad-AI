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
import { OSModuleSquircleIcon } from '@/components/shared/OSModuleIcon';

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
  kpis: any;
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

  const systemMetric = kpis?.system?.leadsTotal ?? null;
  const socialMetric = kpis?.social?.postsScheduled ?? kpis?.social?.postsTotal ?? null;
  const financeMetric = kpis?.finance?.totalHours ?? kpis?.finance?.totalMinutes ?? null;
  const clientMetric = kpis?.client?.clientsTotal ?? null;
  const operationsMetric = kpis?.operations?.activeProjects ?? null;

  return (
    <NexusMasterLayout title="מפקדה" workspace={workspace} user={user} profileHref={profileHref}>
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
            title={modulesRegistry.system.label}
            subtitle={modulesRegistry.system.labelHe}
            iconSlot={<OSModuleSquircleIcon moduleKey="system" boxSize={44} iconSize={18} />}
            metric={systemMetric}
            metricLabel="לידים"
            onClickAction={() => openModule('system')}
            className="min-h-[132px]"
          />

          <NexusCard
            title={modulesRegistry.operations.label}
            subtitle={modulesRegistry.operations.labelHe}
            iconSlot={<OSModuleSquircleIcon moduleKey="operations" boxSize={44} iconSize={18} />}
            metric={operationsMetric}
            metricLabel={kpis?.operations?.locked ? 'אין הרשאה' : 'פרויקטים'}
            onClickAction={() => openModule('operations')}
            className="min-h-[132px]"
          />

          <NexusCard
            title={modulesRegistry.finance.label}
            subtitle={modulesRegistry.finance.labelHe}
            iconSlot={<OSModuleSquircleIcon moduleKey="finance" boxSize={44} iconSize={18} />}
            metric={financeMetric}
            metricLabel={kpis?.finance?.locked ? 'אין הרשאה' : 'שעות'}
            onClickAction={() => openModule('finance')}
            className="min-h-[132px]"
          />

          <NexusCard
            title={modulesRegistry.client.label}
            subtitle={modulesRegistry.client.labelHe}
            iconSlot={<OSModuleSquircleIcon moduleKey="client" boxSize={44} iconSize={18} />}
            metric={clientMetric}
            metricLabel="לקוחות"
            onClickAction={() => openModule('client')}
            className="min-h-[132px]"
          />

          <NexusCard
            title={modulesRegistry.social.label}
            subtitle={modulesRegistry.social.labelHe}
            iconSlot={<OSModuleSquircleIcon moduleKey="social" boxSize={44} iconSize={18} />}
            metric={socialMetric}
            metricLabel="מתוזמנים"
            onClickAction={() => openModule('social')}
            className="min-h-[132px]"
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
            extractMessageText={(m: any) => String(m?.content || '')}
            handleSendMessage={handleSendMessage}
            sendText={(text: string) => sendText(text)}
            starters={GLOBAL_STARTERS}
            onKeyDown={handleKeyDown}
          />
        </div>
      </div>

      <LockedModuleUpgradeModal module={locked} onCloseAction={() => setLocked(null)} />
    </NexusMasterLayout>
  );
}
