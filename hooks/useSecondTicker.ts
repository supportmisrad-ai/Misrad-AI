'use client';

import { useEffect, useState } from 'react';

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

export function useSecondTicker(enabled: boolean): number {
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    if (!enabled) return;

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
