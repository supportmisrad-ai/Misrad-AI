'use client';

import { useEffect, useMemo, useState } from 'react';
import type { OSModuleKey } from '@/lib/os/modules/types';

export type ModuleIconNames = Partial<Record<OSModuleKey, string>>;

let cachedModuleIcons: ModuleIconNames = {};
let lastFetchedAt = 0;
let inflight: Promise<void> | null = null;
let mountCount = 0;
let started = false;
let intervalId: ReturnType<typeof setInterval> | null = null;
let bc: BroadcastChannel | null = null;

const subscribers = new Set<(icons: ModuleIconNames) => void>();

function notify() {
  subscribers.forEach((fn) => fn(cachedModuleIcons));
}

async function loadModuleIcons(params?: { force?: boolean }) {
  const force = Boolean(params?.force);
  const now = Date.now();

  if (!force && lastFetchedAt && now - lastFetchedAt < 60_000) {
    return;
  }

  if (inflight) {
    return inflight;
  }

  inflight = (async () => {
    try {
      const res = await fetch('/api/os/module-icons');
      if (!res.ok) return;
      const data = await res.json().catch(() => null);
      if (data && typeof data === 'object' && data.moduleIcons && typeof data.moduleIcons === 'object') {
        cachedModuleIcons = data.moduleIcons as any;
        lastFetchedAt = Date.now();
        notify();
      }
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

function start() {
  if (started) return;
  started = true;

  void loadModuleIcons();

  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    try {
      bc = new BroadcastChannel('os-module-icons');
      bc.onmessage = () => void loadModuleIcons({ force: true });
    } catch {
      bc = null;
    }
  }

  const onFocus = () => void loadModuleIcons();
  const onVisibility = () => {
    if (document.visibilityState === 'visible') void loadModuleIcons();
  };
  const onUpdated = () => void loadModuleIcons({ force: true });

  window.addEventListener('focus', onFocus);
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('os:module-icons-updated', onUpdated as any);

  intervalId = setInterval(() => void loadModuleIcons(), 15_000);

  (start as any)._cleanup = () => {
    window.removeEventListener('focus', onFocus);
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('os:module-icons-updated', onUpdated as any);
    if (intervalId) clearInterval(intervalId);
    intervalId = null;
    try {
      bc?.close();
    } catch {
      // ignore
    }
    bc = null;
  };
}

function stop() {
  if (!started) return;
  started = false;
  const cleanup = (start as any)._cleanup as undefined | (() => void);
  if (cleanup) cleanup();
}

export function useModuleIconNames() {
  const [moduleIcons, setModuleIcons] = useState<ModuleIconNames>(() => cachedModuleIcons);

  useEffect(() => {
    mountCount += 1;
    const onChange = (icons: ModuleIconNames) => setModuleIcons(icons);
    subscribers.add(onChange);

    setModuleIcons(cachedModuleIcons);
    if (mountCount === 1) {
      start();
    } else {
      void loadModuleIcons();
    }

    return () => {
      subscribers.delete(onChange);
      mountCount = Math.max(0, mountCount - 1);
      if (mountCount === 0) {
        stop();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return useMemo(() => ({ moduleIcons, refresh: () => loadModuleIcons({ force: true }) }), [moduleIcons]);
}
