// Dashboard utility functions and types
// Extracted from DashboardView.tsx to reduce bundle size and improve maintainability

import type { LucideIcon } from 'lucide-react';
import type { ModuleId } from '../../types';

// Types
export type OwnerDashboardAction = {
  id: string;
  source: 'nexus' | 'system' | 'social' | 'finance' | 'client';
  title: string;
  subtitle?: string;
  href?: string;
  priority: 'urgent' | 'high' | 'normal';
};

export type OwnerDashboardKpis = {
  nexus?: { tasksOpen?: number; tasksUrgent?: number };
  system?: { leadsTotal?: number; leadsHot?: number; leadsIncoming?: number };
  social?: { postsTotal?: number; postsDraft?: number; postsScheduled?: number; postsPublished?: number };
  finance?: { totalMinutes?: number; totalHours?: number } | { locked: true };
  [key: string]: unknown;
};

export type OwnerDashboardData = {
  kpis?: OwnerDashboardKpis;
  nextActions?: OwnerDashboardAction[];
  [key: string]: unknown;
};

export type OnboardingStep = {
  id: number;
  label: string;
  subLabel: string;
  done: boolean;
  icon: LucideIcon;
  action: () => void;
  color: string;
  moduleId?: ModuleId;
};

// Utility functions
export function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null;
  if (Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function getStringProp(obj: Record<string, unknown> | null, key: string): string | null {
  const v = obj?.[key];
  return typeof v === 'string' ? v : null;
}

export function getNumberProp(obj: Record<string, unknown> | null, key: string): number | null {
  const v = obj?.[key];
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

export function getUiPreferences(user: unknown): Record<string, unknown> {
  const u = asObject(user);
  const prefs = asObject(u?.uiPreferences);
  return prefs ?? {};
}

export function getOnboardingPrefs(user: unknown, onboardingKey: string): Record<string, unknown> {
  const prefs = getUiPreferences(user);
  const raw = prefs[onboardingKey];
  return asObject(raw) ?? {};
}

export function coerceOwnerDashboardAction(value: unknown): OwnerDashboardAction | null {
  const obj = asObject(value);
  if (!obj) return null;
  const id = getStringProp(obj, 'id') ?? '';
  const title = getStringProp(obj, 'title') ?? '';
  const sourceRaw = getStringProp(obj, 'source') ?? '';
  const priorityRaw = getStringProp(obj, 'priority') ?? '';
  if (!id || !title) return null;

  const source: OwnerDashboardAction['source'] =
    sourceRaw === 'nexus' || sourceRaw === 'system' || sourceRaw === 'social' || sourceRaw === 'finance' || sourceRaw === 'client'
      ? sourceRaw
      : 'nexus';

  const priority: OwnerDashboardAction['priority'] =
    priorityRaw === 'urgent' || priorityRaw === 'high' || priorityRaw === 'normal' ? priorityRaw : 'normal';

  const subtitle = getStringProp(obj, 'subtitle') ?? undefined;
  const href = getStringProp(obj, 'href') ?? undefined;

  return { id, source, title, ...(subtitle ? { subtitle } : {}), ...(href ? { href } : {}), priority };
}

export function coerceOwnerDashboardKpis(value: unknown): OwnerDashboardKpis | undefined {
  const obj = asObject(value);
  if (!obj) return undefined;

  const nexusObj = asObject(obj.nexus);
  const systemObj = asObject(obj.system);
  const socialObj = asObject(obj.social);
  const financeObj = asObject(obj.finance);

  const nexus = nexusObj
    ? { tasksOpen: getNumberProp(nexusObj, 'tasksOpen') ?? undefined, tasksUrgent: getNumberProp(nexusObj, 'tasksUrgent') ?? undefined }
    : undefined;
  const system = systemObj
    ? {
        leadsTotal: getNumberProp(systemObj, 'leadsTotal') ?? undefined,
        leadsHot: getNumberProp(systemObj, 'leadsHot') ?? undefined,
        leadsIncoming: getNumberProp(systemObj, 'leadsIncoming') ?? undefined,
      }
    : undefined;
  const social = socialObj
    ? {
        postsTotal: getNumberProp(socialObj, 'postsTotal') ?? undefined,
        postsDraft: getNumberProp(socialObj, 'postsDraft') ?? undefined,
        postsScheduled: getNumberProp(socialObj, 'postsScheduled') ?? undefined,
        postsPublished: getNumberProp(socialObj, 'postsPublished') ?? undefined,
      }
    : undefined;

  let finance: OwnerDashboardKpis['finance'] | undefined;
  if (financeObj) {
    const locked = Boolean(financeObj.locked);
    finance = locked
      ? { locked: true }
      : {
          totalMinutes: getNumberProp(financeObj, 'totalMinutes') ?? undefined,
          totalHours: getNumberProp(financeObj, 'totalHours') ?? undefined,
        };
  }

  return {
    ...(nexus ? { nexus } : {}),
    ...(system ? { system } : {}),
    ...(social ? { social } : {}),
    ...(finance ? { finance } : {}),
  };
}

export function coerceOwnerDashboardData(value: unknown): OwnerDashboardData | null {
  const obj = asObject(value);
  if (!obj) return null;

  const nextActionsRaw = obj.nextActions;
  const nextActions = Array.isArray(nextActionsRaw)
    ? nextActionsRaw.map(coerceOwnerDashboardAction).filter((v): v is OwnerDashboardAction => Boolean(v))
    : undefined;

  const kpis = coerceOwnerDashboardKpis(obj.kpis);

  return {
    ...(kpis ? { kpis } : {}),
    ...(nextActions ? { nextActions } : {}),
  };
}

export function isLockedFinance(value: OwnerDashboardKpis['finance']): value is { locked: true } {
  const obj = asObject(value);
  return Boolean(obj && obj.locked === true);
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(amount);
}

// Constants
export const TOUR_PROMPT_STORAGE_KEY = 'nexus_seen_tour_prompt_v1';
export const ONBOARDING_KEY = 'nexusOnboarding';
