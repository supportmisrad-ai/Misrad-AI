'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';
import { parseWorkspaceRoute, encodeWorkspaceOrgSlug } from '@/lib/os/social-routing';
import { getActiveShift, punchIn, punchOut, updateEntryLocation } from '@/app/actions/attendance';
import { useSecondTicker } from '@/hooks/useSecondTicker';
import { getAttendanceCache, setAttendanceCache } from '@/lib/attendance-cache';

const BROADCAST_CHANNEL = 'NEXUS_ATTENDANCE_V1';

/** Guard: never send optimistic IDs to server raw-SQL calls */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isRealEntryId(id: string | null | undefined): id is string {
  return typeof id === 'string' && UUID_RE.test(id);
}

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

function broadcastAttendance(orgSlug: string, entryId: string | null, startTime: string | null) {
  if (typeof window === 'undefined') return;
  try {
    const bc = new BroadcastChannel(BROADCAST_CHANNEL);
    bc.postMessage({ orgSlug, entryId, startTime });
    bc.close();
  } catch {
    // ignore
  }
}

function getLocationAsync(): Promise<{ lat: number; lng: number; accuracy: number } | null> {
  if (typeof window === 'undefined' || !('geolocation' in navigator)) return Promise.resolve(null);
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 60000 }
    );
  });
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

export function useAttendanceTile(): UseAttendanceTileResult {
  const pathname = usePathname();
  const { orgSlug, module } = useMemo(() => parseWorkspaceRoute(pathname), [pathname]);

  let isClerkLoaded = false;
  let isSignedIn = false;
  try {
    const clerk = useUser();
    isClerkLoaded = clerk.isLoaded;
    isSignedIn = Boolean(clerk.isSignedIn);
  } catch {
    isClerkLoaded = true;
    isSignedIn = false;
  }

  const [startTime, setStartTime] = useState<string | null>(() =>
    orgSlug ? getAttendanceCache(orgSlug)?.startTime ?? null : null
  );
  const [entryId, setEntryId] = useState<string | null>(() =>
    orgSlug ? getAttendanceCache(orgSlug)?.entryId ?? null : null
  );
  const [isBusy, setIsBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const now = useSecondTicker(Boolean(startTime));
  const lastBroadcastRef = useRef(0);
  const loadInFlightRef = useRef(false);
  const busyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Safety timeout: auto-reset isBusy after 15 seconds to prevent stuck button
  const setBusySafe = useCallback((busy: boolean) => {
    if (busyTimerRef.current) {
      clearTimeout(busyTimerRef.current);
      busyTimerRef.current = null;
    }
    if (busy) {
      busyTimerRef.current = setTimeout(() => {
        setIsBusy(false);
        busyTimerRef.current = null;
      }, 15_000);
    }
    setIsBusy(busy);
  }, []);

  // Cleanup busy timer on unmount
  useEffect(() => {
    return () => {
      if (busyTimerRef.current) clearTimeout(busyTimerRef.current);
    };
  }, []);

  const shouldShow = Boolean(
    orgSlug &&
    isClerkLoaded &&
    isSignedIn &&
    module &&
    OS_MODULES_WITH_ATTENDANCE.has(module)
  );

  const broadcast = useCallback((payload: { orgSlug: string; entryId: string | null; startTime: string | null }) => {
    broadcastAttendance(payload.orgSlug, payload.entryId, payload.startTime);
  }, []);

  useEffect(() => {
    if (!orgSlug) return;
    if (entryId && startTime) {
      setAttendanceCache(orgSlug, { entryId, startTime });
    } else if (!entryId && !startTime) {
      setAttendanceCache(orgSlug, null);
    }
  }, [orgSlug, entryId, startTime]);

  const loadActiveShift = useCallback(async () => {
    if (!orgSlug || !isClerkLoaded || !isSignedIn) return;
    if (loadInFlightRef.current) return;
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
    if (Date.now() - lastBroadcastRef.current < 10_000) return;
    loadInFlightRef.current = true;
    try {
      const data = await getActiveShift(orgSlug);
      const shift = data?.activeShift;
      if (shift?.id && shift?.startTime) {
        const next = { entryId: shift.id, startTime: shift.startTime };
        setEntryId(next.entryId);
        setStartTime(next.startTime);
        broadcast({ orgSlug, entryId: next.entryId, startTime: next.startTime });
      } else {
        setEntryId(null);
        setStartTime(null);
        broadcast({ orgSlug, entryId: null, startTime: null });
      }
    } catch {
      // ignore
    } finally {
      loadInFlightRef.current = false;
    }
  }, [broadcast, isClerkLoaded, isSignedIn, orgSlug]);

  useEffect(() => {
    if (!orgSlug || !isClerkLoaded || !isSignedIn) return;
    let cancelled = false;
    (async () => {
      try {
        const shiftRes = await getActiveShift(orgSlug).catch(() => ({ activeShift: null }));
        if (cancelled) return;
        const shift = (shiftRes as { activeShift: { id: string; startTime: string } | null })?.activeShift;
        if (shift?.id && shift?.startTime && Date.now() - lastBroadcastRef.current > 5_000) {
          setEntryId(shift.id);
          setStartTime(shift.startTime);
          setAttendanceCache(orgSlug, { entryId: shift.id, startTime: shift.startTime });
        } else if (!shift && Date.now() - lastBroadcastRef.current > 5_000) {
          setEntryId(null);
          setStartTime(null);
          setAttendanceCache(orgSlug, null);
        }
      } catch {
        // ignore
      }
    })();
    return () => { cancelled = true; };
  }, [isClerkLoaded, isSignedIn, orgSlug]);

  useEffect(() => {
    if (!orgSlug || typeof window === 'undefined') return;
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel(BROADCAST_CHANNEL);
      bc.onmessage = (ev) => {
        const data = ev?.data;
        if (!data || data.orgSlug !== orgSlug) return;
        lastBroadcastRef.current = Date.now();
        setEntryId(data.entryId || null);
        setStartTime(data.startTime || null);
      };
    } catch {
      // ignore
    }
    return () => { try { bc?.close(); } catch { /* ignore */ } };
  }, [orgSlug]);

  useEffect(() => {
    if (!orgSlug || !isClerkLoaded || !isSignedIn) return;
    const interval = window.setInterval(loadActiveShift, 30_000);
    return () => window.clearInterval(interval);
  }, [isClerkLoaded, isSignedIn, loadActiveShift, orgSlug]);

  // Refresh attendance state when tab becomes visible (cross-module sync)
  useEffect(() => {
    if (typeof document === 'undefined' || !orgSlug || !isClerkLoaded || !isSignedIn) return;
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        // Allow immediate server fetch by resetting throttle
        lastBroadcastRef.current = 0;
        void loadActiveShift();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [isClerkLoaded, isSignedIn, loadActiveShift, orgSlug]);

  const clockIn = useCallback(() => {
    if (!orgSlug || isBusy) return;
    setBusySafe(true);
    setErrorMessage(null);
    const optimisticStart = new Date().toISOString();
    const optimisticId = `optimistic-${Date.now()}`;
    setEntryId(optimisticId);
    setStartTime(optimisticStart);
    broadcast({ orgSlug, entryId: optimisticId, startTime: optimisticStart });

    void (async () => {
      const gpsPromise = getLocationAsync();
      try {
        const res = await punchIn(orgSlug, undefined, { lat: 0, lng: 0, accuracy: 0 });
        const realId = res?.activeShift?.id;
        const realStart = res?.activeShift?.startTime;
        if (realId && realStart) {
          setEntryId(realId);
          setStartTime(new Date(realStart).toISOString());
          broadcast({ orgSlug, entryId: realId, startTime: new Date(realStart).toISOString() });
          const loc = await gpsPromise;
          if (loc && (loc.lat !== 0 || loc.lng !== 0) && isRealEntryId(realId)) {
            try {
              await updateEntryLocation(orgSlug, realId, 'start', loc);
            } catch { /* non-critical */ }
          }
        }
      } catch {
        setEntryId(null);
        setStartTime(null);
        broadcast({ orgSlug, entryId: null, startTime: null });
      } finally {
        setBusySafe(false);
      }
    })();
  }, [broadcast, isBusy, orgSlug, setBusySafe]);

  const clockOut = useCallback(() => {
    // Allow clock-out even without entryId — punchOut resolves active shift server-side
    if (!orgSlug || isBusy) return;
    // If neither entryId nor startTime exist, nothing to clock out from
    if (!entryId && !startTime) return;
    setBusySafe(true);
    setErrorMessage(null);
    const prevEntryId = entryId;
    const prevStartTime = startTime;
    setEntryId(null);
    setStartTime(null);
    broadcast({ orgSlug, entryId: null, startTime: null });

    const gpsPromise = getLocationAsync();

    void (async () => {
      try {
        const res = await punchOut(orgSlug, undefined, { lat: 0, lng: 0, accuracy: 0 });
        void loadActiveShift();
        const closedId = res?.entryId || prevEntryId;
        if (isRealEntryId(closedId) && orgSlug) {
          const loc = await gpsPromise;
          if (loc && (loc.lat !== 0 || loc.lng !== 0)) {
            try {
              await updateEntryLocation(orgSlug, closedId, 'end', loc);
            } catch { /* non-critical */ }
          }
        }
      } catch (e: unknown) {
        setEntryId(prevEntryId);
        setStartTime(prevStartTime);
        broadcast({ orgSlug, entryId: prevEntryId, startTime: prevStartTime });
        setErrorMessage(String(e instanceof Error ? e.message : e) || 'שגיאה ביציאה');
      } finally {
        setBusySafe(false);
      }
    })();
  }, [broadcast, entryId, isBusy, loadActiveShift, orgSlug, setBusySafe, startTime]);

  const elapsedMs = startTime ? now - new Date(startTime).getTime() : 0;
  const meHref = orgSlug ? `/w/${encodeWorkspaceOrgSlug(orgSlug)}/nexus/me` : '/me';

  return {
    shouldShow,
    isActive: Boolean(startTime),
    elapsedMs,
    isBusy,
    errorMessage,
    clockIn,
    clockOut,
    meHref,
    orgSlug,
  };
}
