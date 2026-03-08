'use client';

import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { parseWorkspaceRoute, encodeWorkspaceOrgSlug } from '@/lib/os/social-routing';
import { useSecondTicker } from '@/hooks/useSecondTicker';

// Import the raw context so we can do a safe (non-throwing) check
import { DataContext } from '@/context/DataContext';

const OS_MODULES_WITH_ATTENDANCE = new Set(['nexus', 'system', 'operations', 'finance', 'social', 'client']);

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

  const isActive = Boolean(activeShift);
  const startTime = activeShift?.startTime ?? null;

  const now = useSecondTicker(isActive);
  const elapsedMs = startTime ? now - new Date(startTime).getTime() : 0;

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
    }
  }, [activeShift?.id]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { if (busyTimerRef.current) clearTimeout(busyTimerRef.current); };
  }, []);

  const shouldShow = Boolean(
    orgSlug && data && module && OS_MODULES_WITH_ATTENDANCE.has(module)
  );

  const clockIn = useCallback(() => {
    if (!authClockIn || isBusy) return;
    setIsBusy(true);
    // Safety timeout: auto-reset after 10s in case state doesn't change
    busyTimerRef.current = setTimeout(() => { setIsBusy(false); busyTimerRef.current = null; }, 10_000);
    authClockIn();
  }, [authClockIn, isBusy]);

  const clockOut = useCallback(() => {
    if (!authClockOut || isBusy) return;
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
