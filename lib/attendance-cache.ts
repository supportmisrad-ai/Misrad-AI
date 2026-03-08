/**
 * Module-level attendance cache.
 *
 * Survives React component unmount/remount within the same browser session.
 * All attendance components (AttendanceMiniStatus, MobileMenuAttendanceButton,
 * useAuth, MeView) read from here on mount for *instant* UI and write here
 * whenever the attendance state changes (clock-in / clock-out / server refresh).
 *
 * This eliminates the "flash of empty" that happens when components remount
 * after navigation and have to wait for an async server call.
 */

type AttendanceSnapshot = {
  entryId: string;
  startTime: string;
};

type CacheListener = (orgSlug: string, snapshot: AttendanceSnapshot | null) => void;

const cache = new Map<string, AttendanceSnapshot | null>();
const listeners = new Set<CacheListener>();

export function getAttendanceCache(orgSlug: string): AttendanceSnapshot | null {
  return cache.get(orgSlug) ?? null;
}

export function setAttendanceCache(
  orgSlug: string,
  snapshot: AttendanceSnapshot | null,
): void {
  if (snapshot) {
    cache.set(orgSlug, snapshot);
  } else {
    cache.delete(orgSlug);
  }
  for (const fn of listeners) {
    try { fn(orgSlug, snapshot ?? null); } catch { /* ignore */ }
  }
}

export function subscribeAttendanceCache(fn: CacheListener): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}
