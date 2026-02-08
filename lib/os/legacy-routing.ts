import type { OSModuleKey } from '@/lib/os/modules/types';

type SplitPathResult = { path: string; suffix: string };

function splitPathQueryAndHash(input: string): SplitPathResult {
  const raw = String(input || '');
  const hashIndex = raw.indexOf('#');
  const withNoHash = hashIndex >= 0 ? raw.slice(0, hashIndex) : raw;
  const hash = hashIndex >= 0 ? raw.slice(hashIndex) : '';

  const queryIndex = withNoHash.indexOf('?');
  const path = queryIndex >= 0 ? withNoHash.slice(0, queryIndex) : withNoHash;
  const query = queryIndex >= 0 ? withNoHash.slice(queryIndex) : '';

  return { path, suffix: `${query}${hash}` };
}

function isSafeRelativePath(path: string): boolean {
  if (!path) return false;
  if (!path.startsWith('/')) return false;
  if (path.startsWith('//')) return false;
  return true;
}

export function normalizeLegacyRedirectPath(rawPath: string | null | undefined): string | null {
  const input = String(rawPath || '').trim();
  if (!isSafeRelativePath(input)) return null;

  const { path, suffix } = splitPathQueryAndHash(input);

  const mapPrefixDropRest = (sourcePrefix: string, targetPrefix: string): string | null => {
    if (path === sourcePrefix || path.startsWith(`${sourcePrefix}/`)) {
      return `${targetPrefix}${suffix}`;
    }
    return null;
  };

  const mapPrefix = (sourcePrefix: string, targetPrefix: string): string | null => {
    if (path === sourcePrefix || path.startsWith(`${sourcePrefix}/`)) {
      return `${targetPrefix}${path.slice(sourcePrefix.length)}${suffix}`;
    }
    return null;
  };

  return (
    mapPrefixDropRest('/client-os', '/client') ||
    mapPrefixDropRest('/finance-os', '/finance') ||
    mapPrefixDropRest('/system-os', '/system') ||
    mapPrefixDropRest('/nexus-os', '/app') ||
    mapPrefix('/nexus/app', '/app') ||
    `${path}${suffix}`
  );
}

export function resolveModuleKeyFromRedirectPath(rawPath: string | null | undefined): OSModuleKey | null {
  const normalized = normalizeLegacyRedirectPath(rawPath);
  if (!normalized) return null;

  const { path } = splitPathQueryAndHash(normalized);

  if (path.startsWith('/w/')) {
    const parts = path.split('/').filter(Boolean);
    const moduleKey = parts[2] || null;
    if (
      moduleKey === 'nexus' ||
      moduleKey === 'system' ||
      moduleKey === 'social' ||
      moduleKey === 'finance' ||
      moduleKey === 'client' ||
      moduleKey === 'operations'
    ) {
      return moduleKey;
    }
    return null;
  }

  if (path.startsWith('/social')) return 'social';
  if (path.startsWith('/finance')) return 'finance';
  if (path.startsWith('/client')) return 'client';
  if (path.startsWith('/operations')) return 'operations';
  if (path.startsWith('/system')) return 'system';
  if (path.startsWith('/pipeline')) return 'system';
  if (path.startsWith('/app')) return 'nexus';
  if (path.startsWith('/nexus')) return 'nexus';

  return null;
}

export function toWorkspacePathForOrgSlug(orgSlug: string, rawPath: string): string {
  const normalized = normalizeLegacyRedirectPath(rawPath) || rawPath;
  if (!isSafeRelativePath(normalized)) return normalized;

  const { path, suffix } = splitPathQueryAndHash(normalized);

  if (path.startsWith('/w/')) return normalized;

  const base = `/w/${encodeURIComponent(String(orgSlug))}`;

  const mapPrefix = (sourcePrefix: string, moduleKey: OSModuleKey): string | null => {
    if (path === sourcePrefix || path.startsWith(`${sourcePrefix}/`)) {
      return `${base}/${moduleKey}${path.slice(sourcePrefix.length)}${suffix}`;
    }
    return null;
  };

  if (path === '/pipeline' || path.startsWith('/pipeline/')) {
    return `${base}/system/sales_pipeline${suffix}`;
  }

  if (path === '/app/admin' || path.startsWith('/app/admin/')) {
    return normalized;
  }

  return (
    mapPrefix('/client', 'client') ||
    mapPrefix('/finance', 'finance') ||
    mapPrefix('/system', 'system') ||
    mapPrefix('/social', 'social') ||
    mapPrefix('/operations', 'operations') ||
    mapPrefix('/app', 'nexus') ||
    mapPrefix('/nexus', 'nexus') ||
    normalized
  );
}

export function isLegacyLoginEntrypointPathname(pathname: string): boolean {
  const p = String(pathname || '');
  return (
    p === '/client-os' ||
    p.startsWith('/client-os/') ||
    p === '/finance-os' ||
    p.startsWith('/finance-os/') ||
    p === '/nexus-os' ||
    p.startsWith('/nexus-os/') ||
    p === '/system-os' ||
    p.startsWith('/system-os/') ||
    p === '/pipeline' ||
    p.startsWith('/pipeline/')
  );
}

export function legacyAppPathnameRedirect(pathname: string): string | null {
  const p = String(pathname || '');
  if (p === '/nexus/app' || p.startsWith('/nexus/app/')) {
    return `/app${p.slice('/nexus/app'.length) || ''}`;
  }
  return null;
}
