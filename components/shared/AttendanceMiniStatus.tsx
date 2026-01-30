'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Clock, LogOut } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { parseWorkspaceRoute } from '@/lib/os/social-routing';
import { getNexusMe, listNexusTimeEntries, updateNexusTimeEntry } from '@/app/actions/nexus';

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
  const [hasNexus, setHasNexus] = useState<boolean | null>(null);
  const [startTime, setStartTime] = useState<string | null>(null);
  const [entryId, setEntryId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    const loadEntitlements = async () => {
      if (!orgSlug) {
        setHasNexus(null);
        return;
      }
      try {
        const res = await fetch(`/api/workspaces/${encodeURIComponent(orgSlug)}/entitlements`, { cache: 'no-store' });
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
  }, [orgSlug]);

  useEffect(() => {
    const loadMe = async () => {
      if (!orgSlug) return;
      try {
        const data = await getNexusMe({ orgId: orgSlug });
        const id = data?.user?.id ? String(data.user.id) : null;
        if (id) setUserId(id);
      } catch {
        // ignore
      }
    };

    loadMe();
  }, [orgSlug]);

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
      const list = Array.isArray(data?.timeEntries) ? data.timeEntries : [];
      const active = list
        .filter((e: any) => !e?.endTime)
        .sort((a: any, b: any) => new Date(b?.startTime || 0).getTime() - new Date(a?.startTime || 0).getTime())[0];

      if (active?.id && active?.startTime) {
        const next = { entryId: String(active.id), startTime: new Date(active.startTime).toISOString() };
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
    }
  }, [broadcast, orgSlug, userId]);

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
    loadActiveShift();
    const interval = window.setInterval(loadActiveShift, 25_000);
    return () => window.clearInterval(interval);
  }, [loadActiveShift, orgSlug]);

  useEffect(() => {
    if (!orgSlug) return;
    if (!startTime) return;
    if (entryId) return;
    loadActiveShift();
  }, [entryId, loadActiveShift, orgSlug, startTime]);

  useEffect(() => {
    if (!startTime) return;
    const tick = () => setNow(Date.now());
    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [startTime]);

  const clockOutQuick = useCallback(async () => {
    if (!entryId || !orgSlug) return;
    setIsBusy(true);
    try {
      await updateNexusTimeEntry({ orgId: orgSlug, entryId, endTime: new Date().toISOString() });
      setEntryId(null);
      setStartTime(null);
      broadcast({ orgSlug, entryId: null, startTime: null });
      void loadActiveShift();
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
