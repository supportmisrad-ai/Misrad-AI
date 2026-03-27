'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Lock } from 'lucide-react';
import { OSModuleKey } from '@/lib/os/modules/types';
import { modulesRegistry } from '@/lib/os/modules/registry';
import { LockedModuleUpgradeModal } from '@/components/shared/LockedModuleUpgradeModal';
import { OS_MODULES } from '@/types/os-modules';
import { OSModuleSquircleIcon } from '@/components/shared/OSModuleIcon';

export default function LobbyModulesGrid({
  orgSlug,
  entitlements,
}: {
  orgSlug: string;
  entitlements: Record<OSModuleKey, boolean>;
}) {
  const [locked, setLocked] = useState<OSModuleKey | null>(null);

  const allKeys = OS_MODULES.map((m) => m.id as OSModuleKey);
  const ordered: OSModuleKey[] = ['nexus', ...allKeys.filter((k) => k !== 'nexus')];

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {ordered.map((key) => {
          const def = modulesRegistry[key];
          const enabled = key === 'nexus' ? true : Boolean(entitlements[key]);
          const href = `/w/${encodeURIComponent(orgSlug)}/${key}`;

          return enabled ? (
            <Link
              key={key}
              href={href}
              prefetch={true}
              className="group relative rounded-3xl border border-white/70 backdrop-blur p-6 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.35)] hover:shadow-[0_30px_80px_-35px_rgba(15,23,42,0.45)] transition-all overflow-hidden text-right bg-white/70"
            >
              <div
                className="absolute inset-0 opacity-60 group-hover:opacity-100 transition-opacity"
                style={{
                  background: `radial-gradient(600px circle at 30% 10%, ${def.theme.accent}26, transparent 40%)`,
                }}
              />

              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <OSModuleSquircleIcon moduleKey={key} boxSize={48} iconSize={20} disabled={false} />
                  <div>
                    <div className="font-black text-lg flex items-center gap-2 text-slate-900">
                      {def.label}
                    </div>
                  </div>
                </div>
                <div className="transition text-sm font-black text-slate-500 group-hover:text-slate-900">
                  כניסה
                </div>
              </div>
            </Link>
          ) : (
            <button
              key={key}
              type="button"
              onClick={() => setLocked(key)}
              className="group relative rounded-3xl border border-white/70 backdrop-blur p-6 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.35)] hover:shadow-[0_30px_80px_-35px_rgba(15,23,42,0.45)] transition-all overflow-hidden text-right bg-slate-50/80"
            >
              <div
                className="absolute inset-0 opacity-100"
                style={{
                  background: 'radial-gradient(600px circle at 30% 10%, rgba(148,163,184,0.22), transparent 45%)',
                }}
              />

              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <OSModuleSquircleIcon moduleKey={key} boxSize={48} iconSize={20} disabled={true} />
                  <div>
                    <div className="font-black text-lg flex items-center gap-2 text-slate-500">
                      {def.label}
                      <Lock size={14} className="text-slate-400" />
                    </div>
                  </div>
                </div>
                <div className="transition text-sm font-black text-slate-400 group-hover:text-slate-600">
                  שדרוג
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {locked && <LockedModuleUpgradeModal module={locked} onCloseAction={() => setLocked(null)} />}
    </>
  );
}
