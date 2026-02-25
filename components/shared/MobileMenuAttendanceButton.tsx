'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Clock, Fingerprint, LogOut } from 'lucide-react';
import { useUser } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';
import { parseWorkspaceRoute, encodeWorkspaceOrgSlug } from '@/lib/os/social-routing';
import { getActiveShift, punchIn, punchOut, updateEntryLocation } from '@/app/actions/attendance';
import { useSecondTicker } from '@/hooks/useSecondTicker';
import { getAttendanceCache, setAttendanceCache } from '@/lib/attendance-cache';

const BROADCAST_CHANNEL = 'NEXUS_ATTENDANCE_V1';

function formatDuration(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export default function MobileMenuAttendanceButton() {
  const pathname = usePathname();
  const { orgSlug } = useMemo(() => parseWorkspaceRoute(pathname), [pathname]);

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

  const [hasNexus, setHasNexus] = useState<boolean | null>(null);
  const [startTime, setStartTime] = useState<string | null>(() => {
    if (!orgSlug) return null;
    return getAttendanceCache(orgSlug)?.startTime ?? null;
  });
  const [entryId, setEntryId] = useState<string | null>(() => {
    if (!orgSlug) return null;
    return getAttendanceCache(orgSlug)?.entryId ?? null;
  });
  const [isBusy, setIsBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const now = useSecondTicker(Boolean(startTime));
  const lastBroadcastRef = React.useRef(0);

  // Keep module-level cache in sync with local state
  useEffect(() => {
    if (!orgSlug) return;
    if (entryId && startTime) {
      setAttendanceCache(orgSlug, { entryId, startTime });
    } else if (!entryId && !startTime) {
      setAttendanceCache(orgSlug, null);
    }
  }, [orgSlug, entryId, startTime]);

  useEffect(() => {
    if (!orgSlug || !isClerkLoaded || !isSignedIn) return;
    let cancelled = false;

    (async () => {
      try {
        const [entRes, shiftRes] = await Promise.all([
          fetch(`/api/workspaces/${encodeWorkspaceOrgSlug(orgSlug)}/entitlements`, { cache: 'no-store' })
            .then(r => r.ok ? r.json().catch(() => ({})) : {})
            .catch(() => ({})),
          getActiveShift(orgSlug).catch(() => ({ activeShift: null })),
        ]);
        if (cancelled) return;

        const nexus = Boolean(
          (entRes as Record<string, unknown>)?.entitlements &&
          typeof (entRes as Record<string, unknown>).entitlements === 'object' &&
          ((entRes as Record<string, Record<string, unknown>>).entitlements)?.nexus
        );
        setHasNexus(nexus);

        const shift = (shiftRes as { activeShift: { id: string; startTime: string } | null })?.activeShift;
        if (shift?.id && shift?.startTime) {
          if (Date.now() - lastBroadcastRef.current > 5_000) {
            setEntryId(shift.id);
            setStartTime(shift.startTime);
            setAttendanceCache(orgSlug, { entryId: shift.id, startTime: shift.startTime });
          }
        } else if (!shift) {
          if (Date.now() - lastBroadcastRef.current > 5_000) {
            setEntryId(null);
            setStartTime(null);
            setAttendanceCache(orgSlug, null);
          }
        }
      } catch {
        setHasNexus(false);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();

    return () => { cancelled = true; };
  }, [isClerkLoaded, isSignedIn, orgSlug]);

  const broadcast = useCallback(
    (payload: { orgSlug: string; entryId: string | null; startTime: string | null }) => {
      if (typeof window === 'undefined') return;
      try {
        const bc = new BroadcastChannel(BROADCAST_CHANNEL);
        bc.postMessage(payload);
        bc.close();
      } catch { /* ignore */ }
    },
    []
  );

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
    } catch { /* ignore */ }
    return () => { try { bc?.close(); } catch { /* ignore */ } };
  }, [orgSlug]);

  const handleClockIn = useCallback(() => {
    if (!orgSlug || isBusy) return;
    setIsBusy(true);

    const optimisticStart = new Date().toISOString();
    const optimisticId = `optimistic-${Date.now()}`;
    setEntryId(optimisticId);
    setStartTime(optimisticStart);
    broadcast({ orgSlug, entryId: optimisticId, startTime: optimisticStart });

    void (async () => {
      try {
        const res = await punchIn(orgSlug, undefined, { lat: 0, lng: 0, accuracy: 0 });
        const realId = res?.activeShift?.id;
        if (realId && res?.activeShift?.startTime) {
          setEntryId(realId);
          setStartTime(new Date(res.activeShift.startTime).toISOString());
          broadcast({ orgSlug, entryId: realId, startTime: new Date(res.activeShift.startTime).toISOString() });
        }
        if (realId) {
          void (async () => {
            try {
              if (typeof window === 'undefined' || !('geolocation' in navigator)) return;
              const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 5000, maximumAge: 60000 });
              });
              await updateEntryLocation(orgSlug, realId, 'start', { lat: position.coords.latitude, lng: position.coords.longitude, accuracy: position.coords.accuracy });
            } catch { /* GPS non-critical */ }
          })();
        }
      } catch {
        setEntryId(null);
        setStartTime(null);
        broadcast({ orgSlug, entryId: null, startTime: null });
      } finally {
        setIsBusy(false);
      }
    })();
  }, [broadcast, isBusy, orgSlug]);

  const handleClockOut = useCallback(() => {
    if (!orgSlug || !entryId || isBusy) return;
    setIsBusy(true);

    const prevEntryId = entryId;
    const prevStartTime = startTime;
    setEntryId(null);
    setStartTime(null);
    broadcast({ orgSlug, entryId: null, startTime: null });

    void (async () => {
      try {
        await punchOut(orgSlug, undefined, { lat: 0, lng: 0, accuracy: 0 });
        if (prevEntryId) {
          void (async () => {
            try {
              if (typeof window === 'undefined' || !('geolocation' in navigator)) return;
              const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 });
              });
              await updateEntryLocation(orgSlug, prevEntryId, 'end', { lat: position.coords.latitude, lng: position.coords.longitude, accuracy: position.coords.accuracy });
            } catch { /* GPS non-critical */ }
          })();
        }
      } catch {
        setEntryId(prevEntryId);
        setStartTime(prevStartTime);
        broadcast({ orgSlug, entryId: prevEntryId, startTime: prevStartTime });
      } finally {
        setIsBusy(false);
      }
    })();
  }, [broadcast, entryId, isBusy, orgSlug, startTime]);

  // Show immediately from cache — only hide if server *confirmed* no nexus
  if (!orgSlug) return null;
  if (hasNexus === false) return null;
  if (!loaded && !startTime) return null;

  const isActive = Boolean(startTime);
  const elapsed = isActive ? now - new Date(startTime!).getTime() : 0;

  return (
    <div className="w-full">
      {isActive ? (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleClockOut}
            disabled={isBusy}
            className="flex-1 flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-full bg-rose-500 text-white shadow-lg shadow-rose-500/25 hover:bg-rose-600 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
          >
            <LogOut size={18} strokeWidth={2.5} />
            <span className="text-sm font-black">יציאה</span>
          </button>
          <div className="flex items-center gap-2 px-4 py-3.5 rounded-full bg-emerald-50 border border-emerald-200">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <Clock size={16} className="text-emerald-700" />
            <span className="text-sm font-black text-emerald-900 tabular-nums">{formatDuration(elapsed)}</span>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleClockIn}
          disabled={isBusy}
          className="w-full flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25 hover:from-indigo-600 hover:to-purple-700 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
        >
          <Fingerprint size={20} strokeWidth={2.5} />
          <span className="text-sm font-black">כניסה למשמרת</span>
        </button>
      )}
    </div>
  );
}
