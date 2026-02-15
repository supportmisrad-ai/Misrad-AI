'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Clock, LogOut } from 'lucide-react';
import { useUser } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';
import { parseWorkspaceRoute } from '@/lib/os/social-routing';
import { encodeWorkspaceOrgSlug } from '@/lib/os/social-routing';
import { getNexusMe, listNexusTimeEntries } from '@/app/actions/nexus';
import { punchOut } from '@/app/actions/attendance';
import { useSecondTicker } from '@/hooks/useSecondTicker';
import type { TimeEntry } from '@/types/team';

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
  const [userId, setUserId] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const now = useSecondTicker(Boolean(startTime));
  const loadInFlightRef = React.useRef(false);

  useEffect(() => {
    const loadEntitlements = async () => {
      if (!orgSlug) {
        setHasNexus(null);
        return;
      }
      if (!isClerkLoaded || !isSignedIn) {
        setHasNexus(null);
        return;
      }
      try {
        const res = await fetch(`/api/workspaces/${encodeWorkspaceOrgSlug(orgSlug)}/entitlements`, { cache: 'no-store' });
        if (!res.ok) {
          setHasNexus(false);
          return;
        }
        const data = await res.json().catch(() => ({}));
        setHasNexus(Boolean(data?.entitlements?.nexus));
      } catch {
        setHasNexus(false);
      }
    };

    loadEntitlements();
  }, [isClerkLoaded, isSignedIn, orgSlug]);

  useEffect(() => {
    const loadMe = async () => {
      if (!orgSlug) return;
      if (!isClerkLoaded || !isSignedIn) return;
      try {
        const data = await getNexusMe({ orgId: orgSlug });
        const id = data?.user?.id ? String(data.user.id) : null;
        if (id) setUserId(id);
      } catch {
        // ignore
      }
    };

    loadMe();
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
    loadInFlightRef.current = true;
    try {
      const dateFrom = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const dateTo = new Date().toISOString().split('T')[0];
      const data = await listNexusTimeEntries({
        orgId: orgSlug,
        userId: userId || undefined,
        dateFrom,
        dateTo,
        page: 1,
        pageSize: 200,
      });
      const list: TimeEntry[] = Array.isArray(data?.timeEntries) ? data.timeEntries : [];
      const active = list
        .filter((entry: TimeEntry) => !entry.endTime)
        .sort((a: TimeEntry, b: TimeEntry) => new Date(b.startTime || 0).getTime() - new Date(a.startTime || 0).getTime())[0];

      if (active?.id && active?.startTime) {
        const next = { entryId: active.id, startTime: new Date(active.startTime).toISOString() };
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
  }, [broadcast, isClerkLoaded, isSignedIn, orgSlug, userId]);

  useEffect(() => {
    if (!orgSlug) return;
    if (typeof window === 'undefined') return;

    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel(BROADCAST_CHANNEL);
      bc.onmessage = (ev) => {
        const data = ev?.data;
        if (!data || data.orgSlug !== orgSlug) return;
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

  useEffect(() => {
    if (!orgSlug) return;
    if (!isClerkLoaded || !isSignedIn) return;
    loadActiveShift();
    const interval = window.setInterval(loadActiveShift, 25_000);
    return () => window.clearInterval(interval);
  }, [isClerkLoaded, isSignedIn, loadActiveShift, orgSlug]);

  useEffect(() => {
    if (!orgSlug) return;
    if (!isClerkLoaded || !isSignedIn) return;
    if (!startTime) return;
    if (entryId) return;
    loadActiveShift();
  }, [entryId, isClerkLoaded, isSignedIn, loadActiveShift, orgSlug, startTime]);

  const clockOutQuick = useCallback(async () => {
    if (!entryId || !orgSlug) return;
    setIsBusy(true);
    setErrorMessage(null);
    try {
      if (typeof window === 'undefined') throw new Error('Location not available');
      if (!('geolocation' in navigator)) throw new Error('אין תמיכה במיקום בדפדפן הזה');
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        });
      });
      await punchOut(orgSlug, undefined, {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
      });
      setEntryId(null);
      setStartTime(null);
      broadcast({ orgSlug, entryId: null, startTime: null });
      void loadActiveShift();
    } catch (e: unknown) {
      const msg = String(e instanceof Error ? e.message : e);
      if (msg.toLowerCase().includes('denied')) {
        setErrorMessage('נדרש אישור גישה למיקום כדי לבצע יציאה');
      } else {
        setErrorMessage(msg || 'שגיאה ביציאה');
      }
    } finally {
      setIsBusy(false);
    }
  }, [broadcast, entryId, loadActiveShift, orgSlug]);

  if (!orgSlug) return null;
  if (hasNexus === false) return null;
  if (!startTime) return null;

  const elapsed = now - new Date(startTime).getTime();

  return (
    <div className="flex items-center gap-2 px-2 md:px-3 py-1.5 rounded-full bg-white/60 border border-white/40 shadow-sm">
      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
      <Clock size={14} className="text-emerald-700" />
      <span className="hidden md:inline text-xs font-black text-emerald-800">פעיל</span>
      <span className="text-xs font-bold text-slate-700 tabular-nums">{formatDuration(elapsed)}</span>
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
