'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { OSModuleKey } from '@/lib/os/modules/types';

export type ModuleIconNames = Partial<Record<OSModuleKey, string>>;

export function useModuleIconNames() {
  const [moduleIcons, setModuleIcons] = useState<ModuleIconNames>({});
  const inflightRef = useRef(false);
  const bcRef = useRef<BroadcastChannel | null>(null);

  const load = async () => {
    if (inflightRef.current) return;
    inflightRef.current = true;
    try {
      const res = await fetch('/api/os/module-icons', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json().catch(() => null);
      if (data && typeof data === 'object' && data.moduleIcons && typeof data.moduleIcons === 'object') {
        setModuleIcons(data.moduleIcons as any);
      }
    } finally {
      inflightRef.current = false;
    }
  };

  useEffect(() => {
    load();

    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        const bc = new BroadcastChannel('os-module-icons');
        bcRef.current = bc;
        bc.onmessage = () => load();
      } catch {
        bcRef.current = null;
      }
    }

    const onFocus = () => load();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') load();
    };
    const onUpdated = () => load();

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('os:module-icons-updated', onUpdated as any);

    const interval = window.setInterval(() => load(), 15_000);

    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('os:module-icons-updated', onUpdated as any);
      window.clearInterval(interval);
      try {
        bcRef.current?.close();
      } catch {
        // ignore
      }
      bcRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return useMemo(() => ({ moduleIcons, refresh: load }), [moduleIcons]);
}
