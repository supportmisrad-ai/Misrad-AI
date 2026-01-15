'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { OSModuleKey } from '@/lib/os/modules/types';
import { buildWorkspaceModulePath } from '@/lib/os/modules/registry';
import { OS_MODULES } from '@/types/os-modules';

type WorkspaceItem = {
  id: string;
  slug: string;
  name: string;
  logo?: string | null;
  entitlements: Record<OSModuleKey, boolean>;
};

function parseWorkspaceRoute(pathname: string | null): {
  orgSlug: string | null;
  module: OSModuleKey | null;
  rest: string;
} {
  if (!pathname) return { orgSlug: null, module: null, rest: '' };
  const parts = pathname.split('/').filter(Boolean);
  if (parts[0] !== 'w') return { orgSlug: null, module: null, rest: '' };
  const orgSlug = parts[1] || null;
  const rawModule = parts[2] || null;
  const allowed = new Set<OSModuleKey>(OS_MODULES.map((m) => m.id as OSModuleKey));
  const module = rawModule && allowed.has(rawModule as OSModuleKey) ? (rawModule as OSModuleKey) : null;
  const rest = parts.length > 3 ? `/${parts.slice(3).join('/')}` : '';
  return { orgSlug, module, rest };
}

function getFirstAllowedModule(entitlements: Record<OSModuleKey, boolean>): OSModuleKey | null {
  const order: OSModuleKey[] = OS_MODULES.map((m) => m.id as OSModuleKey);
  for (const key of order) {
    if (entitlements[key]) return key;
  }
  return null;
}

export function WorkspaceSwitcher({ className = '' }: { className?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const routeInfo = useMemo(() => parseWorkspaceRoute(pathname), [pathname]);

  const [workspaces, setWorkspaces] = useState<WorkspaceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/workspaces', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        setWorkspaces(Array.isArray(data?.workspaces) ? data.workspaces : []);
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, []);

  const current = routeInfo.orgSlug;

  if (isLoading) {
    return null;
  }

  if (!current || workspaces.length <= 1) {
    return null;
  }

  return (
    <select
      className={`h-9 px-3 rounded-full bg-white/60 border border-white/50 text-sm font-bold text-slate-800 outline-none ${className}`}
      value={current}
      onChange={(e) => {
        const nextOrg = e.target.value;
        const target = workspaces.find((w) => w.slug === nextOrg);
        if (!target) return;

        const currentModule = routeInfo.module;
        const rest = routeInfo.rest;

        if (currentModule && target.entitlements[currentModule]) {
          router.push(`${buildWorkspaceModulePath(nextOrg, currentModule)}${rest}`);
          return;
        }

        const first = getFirstAllowedModule(target.entitlements);
        if (first) {
          router.push(buildWorkspaceModulePath(nextOrg, first));
          return;
        }

        router.push(`/w/${encodeURIComponent(nextOrg)}/lobby`);
      }}
    >
      {workspaces.map((w) => (
        <option key={w.id} value={w.slug}>
          {w.name}
        </option>
      ))}
    </select>
  );
}
