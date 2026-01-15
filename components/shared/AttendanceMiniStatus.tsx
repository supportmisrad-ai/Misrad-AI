'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Clock, LogOut } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { parseWorkspaceRoute } from '@/lib/os/social-routing';

const STORAGE_KEY_PREFIX = 'NEXUS_ACTIVE_SHIFT_V1';
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

function readActiveShiftStartTime(orgSlug: string | null) {
  if (typeof window === 'undefined') return null;
  if (!orgSlug) return null;
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}:${orgSlug}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const startTime = parsed?.startTime ? String(parsed.startTime) : null;
    if (!startTime) return null;
    const dt = new Date(startTime);
    if (Number.isNaN(dt.getTime())) return null;
    return dt.toISOString();
  } catch {
    return null;
  }
}

function readActiveShiftEntryId(orgSlug: string | null) {
  if (typeof window === 'undefined') return null;
  if (!orgSlug) return null;
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}:${orgSlug}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const entryId = parsed?.entryId ? String(parsed.entryId) : null;
    return entryId || null;
  } catch {
    return null;
  }
}

function writeActiveShift(orgSlug: string, data: { entryId: string; startTime: string } | null) {
  if (typeof window === 'undefined') return;
  try {
    const key = `${STORAGE_KEY_PREFIX}:${orgSlug}`;
    if (!data) {
      localStorage.removeItem(key);
      return;
    }
    localStorage.setItem(
      key,
      JSON.stringify({
        entryId: data.entryId,
        startTime: data.startTime,
        updatedAt: new Date().toISOString(),
      })
    );
  } catch {
    // ignore
  }
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

  const orgHeaders = useMemo(() => {
    if (!orgSlug) return null;
    return { 'x-org-id': orgSlug } as Record<string, string>;
  }, [orgSlug]);

  useEffect(() => {
    const loadMe = async () => {
      if (!orgHeaders) return;
      try {
        const res = await fetch('/api/users/me', { headers: orgHeaders, cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json().catch(() => ({}));
        const id = data?.user?.id ? String(data.user.id) : null;
        if (id) setUserId(id);
      } catch {
        // ignore
      }
    };

    loadMe();
  }, [orgHeaders]);

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

  const syncFromStorage = useCallback(() => {
    setStartTime(readActiveShiftStartTime(orgSlug));
    setEntryId(readActiveShiftEntryId(orgSlug));
  }, [orgSlug]);

  const loadActiveShift = useCallback(async () => {
    if (!orgSlug || !orgHeaders) return;
    try {
      const dateFrom = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const dateTo = new Date().toISOString().split('T')[0];
      const params = new URLSearchParams({ dateFrom, dateTo });
      if (userId) params.set('userId', userId);
      const res = await fetch(`/api/time-entries?${params.toString()}`, { headers: orgHeaders, cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json().catch(() => ({}));
      const list = Array.isArray(data?.timeEntries) ? data.timeEntries : [];
      const active = list
        .filter((e: any) => !e?.endTime)
        .sort((a: any, b: any) => new Date(b?.startTime || 0).getTime() - new Date(a?.startTime || 0).getTime())[0];

      if (active?.id && active?.startTime) {
        const next = { entryId: String(active.id), startTime: new Date(active.startTime).toISOString() };
        setEntryId(next.entryId);
        setStartTime(next.startTime);
        writeActiveShift(orgSlug, next);
        broadcast({ orgSlug, entryId: next.entryId, startTime: next.startTime });
      } else {
        setEntryId(null);
        setStartTime(null);
        writeActiveShift(orgSlug, null);
        broadcast({ orgSlug, entryId: null, startTime: null });
      }
    } catch {
      // ignore
    }
  }, [broadcast, orgHeaders, orgSlug, userId]);

  useEffect(() => {
    syncFromStorage();
  }, [syncFromStorage]);

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
        if (data.entryId && data.startTime) {
          writeActiveShift(orgSlug, { entryId: String(data.entryId), startTime: String(data.startTime) });
        } else {
          writeActiveShift(orgSlug, null);
        }
      };
    } catch {
      // ignore
    }

    const onStorage = (e: StorageEvent) => {
      if (e.key !== `${STORAGE_KEY_PREFIX}:${orgSlug}`) return;
      syncFromStorage();
    };

    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('storage', onStorage);
      try {
        bc?.close();
      } catch {
        // ignore
      }
    };
  }, [orgSlug, syncFromStorage]);

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
    if (!orgHeaders || !entryId || !orgSlug) return;
    setIsBusy(true);
    try {
      const res = await fetch(`/api/time-entries?id=${encodeURIComponent(entryId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...orgHeaders },
        body: JSON.stringify({ endTime: new Date().toISOString() }),
      });
      if (!res.ok) return;
      setEntryId(null);
      setStartTime(null);
      writeActiveShift(orgSlug, null);
      broadcast({ orgSlug, entryId: null, startTime: null });
      void loadActiveShift();
    } finally {
      setIsBusy(false);
    }
  }, [broadcast, entryId, loadActiveShift, orgHeaders, orgSlug]);

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
