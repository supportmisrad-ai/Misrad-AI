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

let cleanupFn: (() => void) | null = null;

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null;
  if (Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function toModuleIconNames(value: unknown): ModuleIconNames {
  const obj = asObject(value);
  if (!obj) return {};
  const out: ModuleIconNames = {};
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'string') {
      out[k as OSModuleKey] = v;
    }
  }
  return out;
}

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
        cachedModuleIcons = toModuleIconNames((data as Record<string, unknown>).moduleIcons);
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
  const onUpdatedEvent: EventListener = (ev) => {
    if (ev instanceof CustomEvent && ev.type === 'os:module-icons-updated') {
      onUpdated();
    }
  };

  window.addEventListener('focus', onFocus);
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('os:module-icons-updated', onUpdatedEvent);

  intervalId = setInterval(() => void loadModuleIcons(), 15_000);

  cleanupFn = () => {
    window.removeEventListener('focus', onFocus);
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('os:module-icons-updated', onUpdatedEvent);
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
  cleanupFn?.();
  cleanupFn = null;
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
