'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Clock, LogIn, LogOut } from 'lucide-react';
import { useUser } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';
import { parseWorkspaceRoute, encodeWorkspaceOrgSlug } from '@/lib/os/social-routing';
import { getActiveShift, punchIn, punchOut, updateEntryLocation } from '@/app/actions/attendance';
import { useSecondTicker } from '@/hooks/useSecondTicker';

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
  const [startTime, setStartTime] = useState<string | null>(null);
  const [entryId, setEntryId] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const now = useSecondTicker(Boolean(startTime));
  const lastBroadcastRef = React.useRef(0);

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

  if (!orgSlug || hasNexus === false || !loaded) return null;

  const isActive = Boolean(startTime);
  const elapsed = isActive ? now - new Date(startTime!).getTime() : 0;

  return (
    <div className="w-full">
      <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider text-right mb-3">שעון נוכחות</div>
      {isActive ? (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50/80 border border-emerald-200/70 shadow-md shadow-emerald-100/50 p-4">
          {/* Subtle background glow */}
          <div className="absolute top-0 left-0 w-32 h-32 bg-emerald-400/10 rounded-full blur-2xl -translate-x-1/2 -translate-y-1/2" />

          <div className="relative flex items-center gap-4">
            {/* Status indicator */}
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-200/60">
              <div className="relative">
                <Clock size={22} className="text-emerald-700" />
                <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse ring-2 ring-emerald-50" />
              </div>
            </div>

            {/* Timer display */}
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide mb-0.5">משמרת פעילה</div>
              <div className="text-2xl font-black text-emerald-900 tabular-nums tracking-tight leading-none">
                {formatDuration(elapsed)}
              </div>
            </div>

            {/* Clock out button */}
            <button
              type="button"
              onClick={handleClockOut}
              disabled={isBusy}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-500 text-white shadow-md shadow-rose-500/25 hover:bg-rose-600 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <LogOut size={16} strokeWidth={2.5} />
              <span className="text-xs font-black">יציאה</span>
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleClockIn}
          disabled={isBusy}
          className="relative w-full overflow-hidden flex items-center justify-center gap-3 px-6 py-4 rounded-2xl transition-all duration-200 bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/40 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="absolute top-0 left-0 w-40 h-40 bg-white/10 rounded-full blur-2xl -translate-x-1/2 -translate-y-1/2" />
          <LogIn size={20} strokeWidth={2.5} className="relative" />
          <span className="text-sm font-black relative">כניסה למשמרת</span>
        </button>
      )}
    </div>
  );
}
