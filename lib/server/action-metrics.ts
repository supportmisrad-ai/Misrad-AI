import 'server-only';

import { randomUUID } from 'crypto';

type StepTiming = { name: string; ms: number };

function isEnabled(): boolean {
  const v = String(process.env.ACTION_METRICS || '').trim().toLowerCase();
  if (!v) return false;
  return v === '1' || v === 'true' || v === 'yes' || v === 'on';
}

function nowMs(): number {
  const g = globalThis && typeof globalThis === 'object' ? (globalThis as unknown) : null;
  const perf = (g ? (g as { performance?: unknown }).performance : undefined) as unknown;
  const perfObj = perf && typeof perf === 'object' ? (perf as Record<string, unknown>) : null;
  const nowFn = perfObj?.now;
  const n = typeof nowFn === 'function' ? (nowFn as () => unknown)() : undefined;
  if (typeof n === 'number' && Number.isFinite(n)) return n;
  return Date.now();
}

export type ActionMetrics = {
  id: string;
  enabled: boolean;
  step<T>(name: string, fn: () => Promise<T>): Promise<T>;
  stepSync<T>(name: string, fn: () => T): T;
  flush(extra?: Record<string, unknown>): void;
};

export function createActionMetrics(action: string, base?: Record<string, unknown>): ActionMetrics {
  const enabled = isEnabled();
  const id = enabled ? randomUUID() : '';
  const steps: StepTiming[] = [];
  const started = enabled ? nowMs() : 0;
  const baseMeta = base && typeof base === 'object' ? base : undefined;

  const step = async <T,>(name: string, fn: () => Promise<T>): Promise<T> => {
    if (!enabled) return fn();
    const s = nowMs();
    try {
      return await fn();
    } finally {
      const e = nowMs();
      steps.push({ name, ms: Math.max(0, e - s) });
    }
  };

  const stepSync = <T,>(name: string, fn: () => T): T => {
    if (!enabled) return fn();
    const s = nowMs();
    try {
      return fn();
    } finally {
      const e = nowMs();
      steps.push({ name, ms: Math.max(0, e - s) });
    }
  };

  const flush = (extra?: Record<string, unknown>) => {
    if (!enabled) return;
    const totalMs = Math.max(0, nowMs() - started);
    const payload = {
      type: 'action_metrics',
      action: String(action || ''),
      id,
      totalMs,
      steps,
      ...(baseMeta ? { base: baseMeta } : {}),
      ...(extra && typeof extra === 'object' ? { extra } : {}),
    };
    try {
      console.log(JSON.stringify(payload));
    } catch {
      console.log(payload);
    }
  };

  return { id, enabled, step, stepSync, flush };
}
