'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';

type Listener = () => void;

let intervalId: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<Listener>();

function start() {
  if (intervalId) return;
  intervalId = setInterval(() => {
    listeners.forEach((l) => l());
  }, 1000);
}

function stop() {
  if (!intervalId) return;
  clearInterval(intervalId);
  intervalId = null;
}

// Use useLayoutEffect if available (client-side), fallback to useEffect
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export function useSecondTicker(enabled: boolean): number {
  // Initialize with 0 to avoid hydration mismatch (server vs client time difference)
  const [now, setNow] = useState<number>(0);
  const firstRenderRef = useRef(true);

  // Synchronous update on enable - ensures immediate display without waiting for next tick
  useIsomorphicLayoutEffect(() => {
    if (!enabled) {
      firstRenderRef.current = true;
      return;
    }

    // On first enable, set immediately synchronously to avoid 1-frame delay
    if (firstRenderRef.current) {
      firstRenderRef.current = false;
      setNow(Date.now());
    }

    const listener = () => setNow(Date.now());
    listeners.add(listener);
    start();

    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) {
        stop();
      }
    };
  }, [enabled]);

  return now;
}
