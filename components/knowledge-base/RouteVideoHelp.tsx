'use client';

import React, { useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Video } from 'lucide-react';

import type { OSModuleKey } from '@/lib/os/modules/types';

function normalizeRoute(pathname: string): string {
  const path = String(pathname || '/');
  const match = path.match(/^\/w\/[^/]+(\/.*)?$/);
  if (match) return match[1] || '/';
  return path || '/';
}

function inferModuleKeyFromPathname(pathname: string): OSModuleKey | null {
  const normalized = normalizeRoute(pathname);
  const first = normalized.split('/').filter(Boolean)[0] || '';
  if (
    first === 'nexus' ||
    first === 'system' ||
    first === 'social' ||
    first === 'finance' ||
    first === 'client' ||
    first === 'operations'
  ) {
    return first as OSModuleKey;
  }
  return null;
}

function inferOrgSlugFromPathname(pathname: string): string | null {
  const path = String(pathname || '/');
  const match = path.match(/^\/w\/([^/]+)(\/.*)?$/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

export function RouteVideoHelp() {
  const pathname = usePathname() || '/';
  const router = useRouter();

  const moduleKey = useMemo(() => inferModuleKeyFromPathname(pathname), [pathname]);

  const orgSlug = useMemo(() => inferOrgSlugFromPathname(pathname), [pathname]);

  const supportHref = useMemo(() => {
    if (!orgSlug) return '/support';
    if (!moduleKey) return `/w/${encodeURIComponent(orgSlug)}/support`;
    return `/w/${encodeURIComponent(orgSlug)}/support/${encodeURIComponent(moduleKey)}`;
  }, [moduleKey, orgSlug]);

  return (
    <>
      <button
        type="button"
        onClick={() => router.push(supportHref)}
        className="fixed bottom-4 left-4 z-[450] flex items-center gap-2 rounded-2xl bg-slate-900 text-white px-4 py-3 shadow-2xl hover:bg-slate-800 transition-colors"
        aria-label="דף תמיכה"
      >
        <Video size={18} />
        <span className="text-sm font-black">עזרה</span>
      </button>
    </>
  );
}
