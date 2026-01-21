'use client';

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

export function getWorkspaceOrgIdFromPathname(pathname: string | null | undefined): string | null {
  const info = parseWorkspaceRoute(pathname);
  return info.orgSlug || null;
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
