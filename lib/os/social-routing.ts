import { OSModuleKey } from '@/lib/os/modules/types';
import { OS_MODULES } from '@/types/os-modules';

export type WorkspaceRouteInfo = {
  orgSlug: string | null;
  module: OSModuleKey | null;
};

function safeDecodeURIComponent(value: string): string {
  let v = String(value ?? '');
  for (let i = 0; i < 3; i++) {
    if (!v.includes('%')) return v;
    try {
      const next = decodeURIComponent(v);
      if (next === v) return v;
      v = next;
    } catch {
      return v;
    }
  }
  return v;
}

export function parseWorkspaceRoute(pathname: string | null | undefined): WorkspaceRouteInfo {
  if (!pathname) return { orgSlug: null, module: null };
  const parts = pathname.split('/').filter(Boolean);
  if (parts[0] !== 'w') return { orgSlug: null, module: null };
  const orgSlugRaw = parts[1] || null;
  const orgSlug = orgSlugRaw ? safeDecodeURIComponent(orgSlugRaw) : null;
  const rawModule = parts[2] || null;
  const allowed = new Set<OSModuleKey>(OS_MODULES.map((m) => m.id as OSModuleKey));
  const workspaceModuleKey = rawModule && allowed.has(rawModule as OSModuleKey) ? (rawModule as OSModuleKey) : null;
  return { orgSlug, module: workspaceModuleKey };
}

export function getSocialBasePath(pathname: string | null | undefined): string {
  if (pathname && pathname.startsWith('/app/admin/social')) {
    return '/social';
  }
  const info = parseWorkspaceRoute(pathname);
  if (info.orgSlug && info.module === 'social') {
    return `/w/${encodeURIComponent(info.orgSlug)}/social`;
  }
  return '/social';
}

export function joinPath(basePath: string, subPath: string): string {
  const base = basePath.endsWith('/') ? basePath.slice(0, -1) : basePath;
  const rawSub = subPath || '/';
  if (rawSub === '/') return base;
  const sub = rawSub.startsWith('/') ? rawSub : `/${rawSub}`;
  return `${base}${sub}`;
}

export function encodeWorkspaceOrgSlug(orgSlug: string): string {
  return encodeURIComponent(String(orgSlug ?? '').trim());
}
