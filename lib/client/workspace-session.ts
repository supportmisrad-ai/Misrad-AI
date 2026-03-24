'use client';

/**
 * workspace-session.ts
 *
 * Client-side session cache for workspace routing.
 * Persists orgSlug + entitlements to localStorage so returning users
 * (APK re-open, PWA revisit) can navigate directly to their workspace
 * without the /login → /me → /w/slug waterfall round-trip.
 *
 * Security model:
 *  - Data is non-sensitive (orgSlug is already visible in the URL).
 *  - On every entry we verify against a userId fingerprint so a different
 *    user on the same device never gets a stale hit.
 *  - TTL: 8 hours. After that we fall back to /me normally.
 *  - On signOut the cache is wiped immediately.
 */

const STORAGE_KEY = 'misrad_ws_session_v1';
const TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

export type WorkspaceSessionData = {
  /** Clerk userId fingerprint — prevents cross-user stale hits */
  userId: string;
  /** org slug (or id) to navigate to */
  orgSlug: string;
  /** Which module was last active */
  lastModule: string | null;
  /** Entitlements so we can pick the right module client-side */
  entitlements: Record<string, boolean>;
  /** Unix ms of when this was written */
  savedAt: number;
};

function isStorageAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const key = '__misrad_ws_test__';
    window.localStorage.setItem(key, '1');
    window.localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

function readRaw(): WorkspaceSessionData | null {
  if (!isStorageAvailable()) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const p = parsed as Record<string, unknown>;
    if (
      typeof p.userId !== 'string' ||
      typeof p.orgSlug !== 'string' ||
      typeof p.savedAt !== 'number' ||
      !p.userId ||
      !p.orgSlug
    ) {
      return null;
    }
    return {
      userId: String(p.userId),
      orgSlug: String(p.orgSlug),
      lastModule: p.lastModule ? String(p.lastModule) : null,
      entitlements: (p.entitlements && typeof p.entitlements === 'object' && !Array.isArray(p.entitlements))
        ? (p.entitlements as Record<string, boolean>)
        : {},
      savedAt: Number(p.savedAt),
    };
  } catch {
    return null;
  }
}

/**
 * Returns a valid cached session for the given userId, or null if:
 *  - No cache exists
 *  - Cache belongs to a different user
 *  - Cache has expired (> 8h)
 */
export function readWorkspaceSession(userId: string): WorkspaceSessionData | null {
  const data = readRaw();
  if (!data) return null;
  if (data.userId !== userId) return null;
  if (Date.now() - data.savedAt > TTL_MS) {
    clearWorkspaceSession();
    return null;
  }
  return data;
}

/**
 * Saves workspace routing info after a successful navigation.
 * Safe to call from any client component.
 */
export function saveWorkspaceSession(params: {
  userId: string;
  orgSlug: string;
  lastModule?: string | null;
  entitlements?: Record<string, boolean>;
}): void {
  if (!isStorageAvailable()) return;
  try {
    const data: WorkspaceSessionData = {
      userId: params.userId,
      orgSlug: params.orgSlug,
      lastModule: params.lastModule ?? null,
      entitlements: params.entitlements ?? {},
      savedAt: Date.now(),
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage full or blocked — silently ignore, fall back to /me
  }
}

/**
 * Wipes the cache. Call on signOut or auth errors.
 */
export function clearWorkspaceSession(): void {
  if (!isStorageAvailable()) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Given a cached session, resolves the best target route.
 * Priority: lastModule > first entitled module > workspace root.
 */
export function resolveTargetRouteFromSession(session: WorkspaceSessionData): string {
  const base = `/w/${encodeURIComponent(session.orgSlug)}`;

  const MODULE_PRIORITY = ['nexus', 'system', 'operations', 'social', 'finance', 'client'] as const;

  if (session.lastModule && session.entitlements[session.lastModule]) {
    return `${base}/${session.lastModule}`;
  }

  const first = MODULE_PRIORITY.find((m) => Boolean(session.entitlements[m]));
  if (first) return `${base}/${first}`;

  return base;
}
