'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Clock, LogOut } from 'lucide-react';
import { useUser } from '@clerk/nextjs';
import { usePathname, useRouter } from 'next/navigation';
import { parseWorkspaceRoute } from '@/lib/os/social-routing';
import { encodeWorkspaceOrgSlug } from '@/lib/os/social-routing';
import { getActiveShift, punchOut, updateEntryLocation } from '@/app/actions/attendance';
import { useSecondTicker } from '@/hooks/useSecondTicker';

const BROADCAST_CHANNEL = 'NEXUS_ATTENDANCE_V1';

function formatDuration(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export default function AttendanceMiniStatus() {
  const pathname = usePathname();
  const router = useRouter();
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const now = useSecondTicker(Boolean(startTime));
  const loadInFlightRef = React.useRef(false);
  const lastBroadcastRef = React.useRef(0);

  // Single effect: load entitlements + active shift in PARALLEL
  useEffect(() => {
    if (!orgSlug || !isClerkLoaded || !isSignedIn) return;
    let cancelled = false;

    (async () => {
      try {
        // Run entitlements check + active shift query in parallel
        const [entRes, shiftRes] = await Promise.all([
          fetch(`/api/workspaces/${encodeWorkspaceOrgSlug(orgSlug)}/entitlements`, { cache: 'no-store' })
            .then(r => r.ok ? r.json().catch(() => ({})) : {})
            .catch(() => ({})),
          getActiveShift(orgSlug).catch(() => ({ activeShift: null })),
        ]);
        if (cancelled) return;

        const nexus = Boolean((entRes as Record<string, unknown>)?.entitlements && typeof (entRes as Record<string, unknown>).entitlements === 'object' && ((entRes as Record<string, Record<string, unknown>>).entitlements)?.nexus);
        setHasNexus(nexus);

        const shift = (shiftRes as { activeShift: { id: string; startTime: string } | null })?.activeShift;
        if (shift?.id && shift?.startTime) {
          // Only set from server if no broadcast was received yet (broadcast is more accurate)
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
      } catch {
        // ignore
      }
    },
    []
  );

  const loadActiveShift = useCallback(async () => {
    if (!orgSlug) return;
    if (!isClerkLoaded || !isSignedIn) return;
    if (loadInFlightRef.current) return;
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
    // Skip if a broadcast was received recently — trust broadcast over periodic poll
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
    if (!orgSlug) return;
    if (typeof window === 'undefined') return;

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

    return () => {
      try {
        bc?.close();
      } catch {
        // ignore
      }
    };
  }, [orgSlug]);

  // Periodic refresh every 30s (after initial load)
  useEffect(() => {
    if (!orgSlug || !isClerkLoaded || !isSignedIn || !loaded) return;
    const interval = window.setInterval(loadActiveShift, 30_000);
    return () => window.clearInterval(interval);
  }, [isClerkLoaded, isSignedIn, loadActiveShift, loaded, orgSlug]);

  const clockOutQuick = useCallback(() => {
    if (!entryId || !orgSlug) return;

    // START GPS IMMEDIATELY — runs in parallel with server call
    let gpsPromise: Promise<{ lat: number; lng: number; accuracy: number; city?: string } | null> = Promise.resolve(null);
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      gpsPromise = (async () => {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 5000,
              maximumAge: 60000,
            });
          });
          let city: string | undefined;
          try {
            const geocodeUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}&accept-language=he`;
            const geocodeRes = await Promise.race([
              fetch(geocodeUrl, { headers: { 'User-Agent': 'MisradAI-Attendance/1.0' } }),
              new Promise<Response>((_, rej) => setTimeout(() => rej(new Error('timeout')), 3000)),
            ]);
            if (geocodeRes.ok) {
              const geocodeData = await geocodeRes.json();
              city = geocodeData?.address?.city || geocodeData?.address?.town || geocodeData?.address?.village || undefined;
            }
          } catch { /* geocoding non-critical */ }
          return { lat: position.coords.latitude, lng: position.coords.longitude, accuracy: position.coords.accuracy, city };
        } catch { return null; }
      })();
    }

    // Snapshot for rollback
    const prevEntryId = entryId;
    const prevStartTime = startTime;

    // INSTANT: Update UI immediately — don't wait for GPS
    setIsBusy(true);
    setErrorMessage(null);
    setEntryId(null);
    setStartTime(null);
    broadcast({ orgSlug, entryId: null, startTime: null });

    // Server call + GPS update (GPS already acquiring in parallel)
    void (async () => {
      try {
        const res = await punchOut(orgSlug, undefined, { lat: 0, lng: 0, accuracy: 0 });

        if (res?.noActiveShift) {
          // Already closed — UI is already correct
        }

        void loadActiveShift();

        // GPS was acquiring in parallel — use result now
        const closedEntryId = res?.entryId || prevEntryId;
        if (closedEntryId && orgSlug) {
          const location = await gpsPromise;
          if (location && (location.lat !== 0 || location.lng !== 0)) {
            try {
              await updateEntryLocation(orgSlug, closedEntryId, 'end', location);
            } catch { /* updateEntryLocation failed */ }
          }
        }
      } catch (e: unknown) {
        // ROLLBACK — restore previous state
        setEntryId(prevEntryId);
        setStartTime(prevStartTime);
        broadcast({ orgSlug, entryId: prevEntryId, startTime: prevStartTime });
        const msg = String(e instanceof Error ? e.message : e);
        setErrorMessage(msg || 'שגיאה ביציאה');
      } finally {
        setIsBusy(false);
      }
    })();
  }, [broadcast, entryId, startTime, loadActiveShift, orgSlug]);

  if (!orgSlug) return null;
  if (hasNexus === false) return null;
  if (!startTime) return null;

  const elapsed = now - new Date(startTime).getTime();

  const meHref = orgSlug ? `/w/${encodeURIComponent(orgSlug)}/nexus/me` : '/me';

  return (
    <div className="flex items-center gap-2 px-2 md:px-3 py-1.5 rounded-full bg-white/60 border border-white/40 shadow-sm">
      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
      <Clock size={14} className="text-emerald-700" />
      <span className="hidden md:inline text-xs font-black text-emerald-800">פעיל</span>
      <button
        type="button"
        onClick={() => router.push(meHref)}
        className="text-xs font-bold text-slate-700 tabular-nums hover:text-emerald-700 transition-colors cursor-pointer bg-transparent border-none p-0"
        aria-label="מעבר לשעון נוכחות"
        title="מעבר לשעון נוכחות"
      >
        {formatDuration(elapsed)}
      </button>
      {errorMessage && (
        <span className="hidden md:inline text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">
          {errorMessage}
        </span>
      )}
      <button
        type="button"
        onClick={clockOutQuick}
        disabled={isBusy || !entryId}
        className="ml-1 p-1 rounded-full text-slate-600 hover:text-slate-900 hover:bg-white/60 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        aria-label="יציאה מהירה"
        title="יציאה מהירה"
      >
        <LogOut size={14} />
      </button>
    </div>
  );
}
