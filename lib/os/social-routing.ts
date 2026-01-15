import { OSModuleKey } from '@/lib/os/modules/types';
import { OS_MODULES } from '@/types/os-modules';

export type WorkspaceRouteInfo = {
  orgSlug: string | null;
  module: OSModuleKey | null;
};

export function parseWorkspaceRoute(pathname: string | null | undefined): WorkspaceRouteInfo {
  if (!pathname) return { orgSlug: null, module: null };
  const parts = pathname.split('/').filter(Boolean);
  if (parts[0] !== 'w') return { orgSlug: null, module: null };
  const orgSlug = parts[1] || null;
  const rawModule = parts[2] || null;
  const allowed = new Set<OSModuleKey>(OS_MODULES.map((m) => m.id as OSModuleKey));
  const module = rawModule && allowed.has(rawModule as OSModuleKey) ? (rawModule as OSModuleKey) : null;
  return { orgSlug, module };
}

export function getSocialBasePath(pathname: string | null | undefined): string {
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
