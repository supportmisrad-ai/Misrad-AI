'use client';

import { useEffect, useMemo, useState } from 'react';
import { parseWorkspaceRoute, joinPath } from '@/lib/os/social-routing';
import { usePathname, useRouter } from 'next/navigation';

export function getNexusBasePath(pathname: string | null | undefined): string {
  const info = parseWorkspaceRoute(pathname);
  if (info.orgSlug && info.module === 'nexus') {
    return `/w/${encodeURIComponent(info.orgSlug)}/nexus`;
  }
  if (info.orgSlug && info.module === 'system') {
    return `/w/${encodeURIComponent(info.orgSlug)}/system`;
  }
  return '/app';
}

export function toNexusPath(basePath: string, subPath: string): string {
  return joinPath(basePath, subPath);
}

export function getWorkspaceOrgSlugFromPathname(pathname: string | null | undefined): string | null {
  const info = parseWorkspaceRoute(pathname);
  return info.orgSlug || null;
}

export function getWorkspaceOrgIdFromPathname(pathname: string | null | undefined): string | null {
  return getWorkspaceOrgSlugFromPathname(pathname);
}

export function useNexusNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const basePath = getNexusBasePath(pathname);

  const navigate = (subPath: string) => {
    const target = toNexusPath(basePath, subPath);
    router.push(target);
  };

  return { basePath, navigate, pathname };
}

export function getNexusSoloModeStorageKey(orgSlug: string): string {
  return `nexus_solo_mode:${orgSlug}`;
}

export function readNexusSoloMode(orgSlug: string | null | undefined): boolean | null {
  if (!orgSlug) return null;
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(getNexusSoloModeStorageKey(orgSlug));
    if (raw == null) return null;
    return raw === '1' || raw === 'true';
  } catch {
    return null;
  }
}

export function writeNexusSoloMode(orgSlug: string, enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(getNexusSoloModeStorageKey(orgSlug), enabled ? '1' : '0');
  } catch {
    return;
  }
  try {
    window.dispatchEvent(new CustomEvent('nexus:solo-mode', { detail: { orgSlug, enabled } }));
  } catch {
    // ignore
  }
}

export function useNexusSoloMode(orgSlug: string | null | undefined, teamSize?: number | null) {
  const [soloModeOverride, setSoloModeOverride] = useState<boolean | null>(null);

  useEffect(() => {
    setSoloModeOverride(readNexusSoloMode(orgSlug));
  }, [orgSlug]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!orgSlug) return;

    const handler = (event: any) => {
      const detail = event?.detail;
      if (!detail || detail.orgSlug !== orgSlug) return;
      setSoloModeOverride(Boolean(detail.enabled));
    };

    window.addEventListener('nexus:solo-mode', handler as any);
    return () => window.removeEventListener('nexus:solo-mode', handler as any);
  }, [orgSlug]);

  const isSoloMode = useMemo(() => {
    if (soloModeOverride !== null) return soloModeOverride;
    const size = typeof teamSize === 'number' ? teamSize : null;
    if (size == null) return false;
    return size <= 1;
  }, [soloModeOverride, teamSize]);

  const setSoloMode = (enabled: boolean) => {
    if (!orgSlug) return;
    writeNexusSoloMode(orgSlug, enabled);
    setSoloModeOverride(enabled);
  };

  return { isSoloMode, soloModeOverride, setSoloMode };
}
