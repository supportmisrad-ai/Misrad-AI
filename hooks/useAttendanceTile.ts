'use client';

import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { parseWorkspaceRoute, encodeWorkspaceOrgSlug } from '@/lib/os/social-routing';
import { useSecondTicker } from '@/hooks/useSecondTicker';

// Import the raw context so we can do a safe (non-throwing) check
import { DataContext } from '@/context/DataContext';
import { getAttendanceCache, subscribeAttendanceCache } from '@/lib/attendance-cache';

// TEMP: Attendance clock is enabled ONLY inside Nexus module to avoid cross-module state confusion.
const OS_MODULES_WITH_ATTENDANCE = new Set(['nexus']);

export function formatAttendanceDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export type UseAttendanceTileResult = {
  /** Whether to render the tile at all (in non-Nexus OS module with orgSlug) */
  shouldShow: boolean;
  /** Active shift: has entryId and startTime */
  isActive: boolean;
  /** Elapsed ms since start (for display) */
  elapsedMs: number;
  /** Busy during server call */
  isBusy: boolean;
  /** Error message to display */
  errorMessage: string | null;
  /** Clock in action */
  clockIn: () => void;
  /** Clock out action */
  clockOut: () => void;
  /** Link to /me for full attendance */
  meHref: string;
  orgSlug: string | null;
};

/**
 * Thin wrapper around useData() (→ useAuth) for attendance UI in sidebars & mobile menus.
 *
 * Single source of truth: activeShift, clockIn, clockOut all come from useAuth
 * through DataContext.  No separate punchIn/punchOut/BroadcastChannel/cache here.
 */
export function useAttendanceTile(): UseAttendanceTileResult {
  const pathname = usePathname();
  const { orgSlug, module } = useMemo(() => parseWorkspaceRoute(pathname), [pathname]);

  // Read from DataContext directly (returns null if outside DataProvider — safe)
  const data = useContext(DataContext);

  const activeShift = data?.activeShift ?? null;
  const authClockIn = data?.clockIn;
  const authClockOut = data?.clockOut;

  // Local cache fallback: makes state instant across module navigation,
  // even while DataProvider/user is still loading.
  const [cachedSnapshot, setCachedSnapshot] = useState(() => (orgSlug ? getAttendanceCache(orgSlug) : null));
  useEffect(() => {
    if (!orgSlug) {
      setCachedSnapshot(null);
      return;
    }
    setCachedSnapshot(getAttendanceCache(orgSlug));
    return subscribeAttendanceCache((changedOrgSlug, snapshot) => {
      if (changedOrgSlug !== orgSlug) return;
      setCachedSnapshot(snapshot);
    });
  }, [orgSlug]);

  // Local optimistic state for immediate UI response on clockIn (before cache/auth update arrives)
  const [optimisticStartTime, setOptimisticStartTime] = useState<string | null>(null);

  // Combine sources: optimistic > activeShift > cachedSnapshot
  const effectiveStartTime = optimisticStartTime ?? activeShift?.startTime ?? cachedSnapshot?.startTime ?? null;
  const isActive = Boolean(effectiveStartTime);
  const startTime = effectiveStartTime;

  const now = useSecondTicker(isActive);
  // Calculate elapsed time from the moment isActive becomes true
  // When ticker starts (now becomes Date.now()), calculate from startTime
  // If now is 0 (initial state), show 0 elapsed time
  const elapsedMs = startTime && now > 0 ? now - new Date(startTime).getTime() : 0;

  // Anti-double-click guard with safety timeout
  const [isBusy, setIsBusy] = useState(false);
  const busyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-reset isBusy when activeShift changes (means clockIn/clockOut completed)
  const prevShiftIdRef = useRef(activeShift?.id ?? null);
  useEffect(() => {
    const currentId = activeShift?.id ?? null;
    if (prevShiftIdRef.current !== currentId) {
      prevShiftIdRef.current = currentId;
      setIsBusy(false);
      if (busyTimerRef.current) { clearTimeout(busyTimerRef.current); busyTimerRef.current = null; }
      // Clear optimistic state once real state arrives
      if (optimisticStartTime) {
        setOptimisticStartTime(null);
      }
    }
  }, [activeShift?.id, optimisticStartTime]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { if (busyTimerRef.current) clearTimeout(busyTimerRef.current); };
  }, []);

  const shouldShow = Boolean(
    orgSlug && data && module && OS_MODULES_WITH_ATTENDANCE.has(module)
  );

  const clockIn = useCallback(() => {
    if (!authClockIn || isBusy) return;
    // Capture timestamp IMMEDIATELY on click - this is the authoritative start time
    const clickTimestamp = new Date().toISOString();
    // Set optimistic state immediately for instant UI feedback
    setOptimisticStartTime(clickTimestamp);
    setIsBusy(true);
    // Safety timeout: auto-reset after 10s in case state doesn't change
    busyTimerRef.current = setTimeout(() => { setIsBusy(false); busyTimerRef.current = null; }, 10_000);
    // Pass the original timestamp to useAuth so it uses the same time
    authClockIn(clickTimestamp);
  }, [authClockIn, isBusy]);

  const clockOut = useCallback(() => {
    if (!authClockOut || isBusy) return;
    // Clear optimistic state immediately
    setOptimisticStartTime(null);
    setIsBusy(true);
    busyTimerRef.current = setTimeout(() => { setIsBusy(false); busyTimerRef.current = null; }, 10_000);
    authClockOut();
  }, [authClockOut, isBusy]);

  const meHref = orgSlug ? `/w/${encodeWorkspaceOrgSlug(orgSlug)}/nexus/me` : '/me';

  return {
    shouldShow,
    isActive,
    elapsedMs,
    isBusy,
    errorMessage: null,
    clockIn,
    clockOut,
    meHref,
    orgSlug,
  };
}
