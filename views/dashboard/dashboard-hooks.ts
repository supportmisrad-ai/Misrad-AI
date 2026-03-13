// Dashboard custom hooks
// Extracted from DashboardView.tsx to reduce component complexity

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth as useClerkAuth } from '@clerk/nextjs';
import { getWorkspaceOrgSlugFromPathname, useNexusNavigation } from '@/lib/os/nexus-routing';
import { encodeWorkspaceOrgSlug } from '@/lib/os/social-routing';
import { upsertMyProfile } from '@/app/actions/profiles';
import { listNexusUsers } from '@/app/actions/nexus';
import { isCeoRole } from '@/lib/constants/roles';
import type { User } from '../../types';
import { 
  coerceOwnerDashboardData, 
  getOnboardingPrefs, 
  getUiPreferences,
  ONBOARDING_KEY,
  TOUR_PROMPT_STORAGE_KEY,
  type OwnerDashboardData 
} from './dashboard-utils';

export function useDashboardUsers(workspaceOrgSlug: string | null) {
  const [users, setUsers] = useState<User[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const usersQuery = useQuery({
    queryKey: ['nexus', 'users', workspaceOrgSlug],
    queryFn: async () => {
      return listNexusUsers({ orgId: workspaceOrgSlug as string, page: 1, pageSize: 200 });
    },
    enabled: Boolean(workspaceOrgSlug),
    staleTime: 5 * 60 * 1000,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  useEffect(() => {
    setIsRefreshing(Boolean(usersQuery.isFetching));
    const next = usersQuery.data?.users;
    if (Array.isArray(next)) {
      setUsers(next);
    }
  }, [usersQuery.data, usersQuery.isFetching]);

  return { users, isRefreshing, refetch: usersQuery.refetch };
}

export function useOwnerDashboard(initialData: unknown | undefined, pathname: string | null) {
  const [ownerDashboard, setOwnerDashboard] = useState<OwnerDashboardData | null>(() => 
    coerceOwnerDashboardData(initialData)
  );
  const [showOwnerDashboard, setShowOwnerDashboard] = useState(false);
  const [isPilotLoading, setIsPilotLoading] = useState(false);
  const [pilotErrorCount, setPilotErrorCount] = useState(0);
  const [isFocusMode, setIsFocusMode] = useState(false);

  useEffect(() => {
    if (initialData) return;
    const orgSlug = getWorkspaceOrgSlugFromPathname(pathname);
    if (!orgSlug) return;
    if (pilotErrorCount >= 3) return;

    let cancelled = false;
    const load = async () => {
      setIsPilotLoading(true);
      try {
        const res = await fetch(`/api/workspaces/${encodeWorkspaceOrgSlug(orgSlug)}/owner-dashboard`, { cache: 'no-store' });
        if (!res.ok) return;
        const json = (await res.json()) as unknown;
        const next = coerceOwnerDashboardData(json);
        if (!cancelled && next) setOwnerDashboard(next);
        if (!cancelled) setPilotErrorCount(0);
      } catch {
        if (!cancelled) setPilotErrorCount((c) => c + 1);
      } finally {
        if (!cancelled) setIsPilotLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [pathname, initialData, pilotErrorCount]);

  const refresh = useCallback(() => {
    const orgSlug = getWorkspaceOrgSlugFromPathname(pathname);
    if (!orgSlug || isPilotLoading) return;
    setIsPilotLoading(true);
    fetch(`/api/workspaces/${encodeWorkspaceOrgSlug(orgSlug)}/owner-dashboard`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data) { setOwnerDashboard(data); setPilotErrorCount(0); } })
      .catch(() => setPilotErrorCount((c) => c + 1))
      .finally(() => setIsPilotLoading(false));
  }, [pathname, isPilotLoading]);

  return {
    ownerDashboard,
    showOwnerDashboard,
    setShowOwnerDashboard,
    isPilotLoading,
    isFocusMode,
    setIsFocusMode,
    pilotErrorCount,
    refresh,
  };
}

export function useOnboarding(
  currentUser: User, 
  initialTemplateKey: string | null | undefined,
  pathname: string | null,
  isAllComplete: boolean
) {
  const [showOnboarding, setShowOnboarding] = useState(true);
  const onboardingPersistedRef = useRef(false);

  const [onboardingTemplate, setOnboardingTemplate] = useState<string | null>(() => {
    const v = initialTemplateKey;
    return typeof v === 'string' && v.trim() ? v : null;
  });
  const [isLoadingOnboardingTemplate, setIsLoadingOnboardingTemplate] = useState(false);
  const [isApplyingOnboardingTemplate, setIsApplyingOnboardingTemplate] = useState(false);

  const { isLoaded: isClerkLoaded, isSignedIn } = useClerkAuth();

  // Load onboarding template if not provided initially
  useEffect(() => {
    if (initialTemplateKey !== undefined) return;
    if (onboardingTemplate) return;
    if (!isClerkLoaded || !isSignedIn) return;
    const orgSlug = getWorkspaceOrgSlugFromPathname(pathname);
    if (!orgSlug) return;

    let cancelled = false;
    const load = async () => {
      setIsLoadingOnboardingTemplate(true);
      try {
        const res = await fetch('/api/nexus/onboarding-template', {
          headers: { 'x-org-id': encodeWorkspaceOrgSlug(orgSlug) },
          cache: 'no-store',
        });
        if (!res.ok) return;
        const data = await res.json();
        const key = (data?.template && (data.template.key || data.template.templateKey)) || null;
        if (!cancelled) setOnboardingTemplate(typeof key === 'string' ? key : null);
      } catch {
        // ignore
      } finally {
        if (!cancelled) setIsLoadingOnboardingTemplate(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [isClerkLoaded, isSignedIn, pathname, initialTemplateKey, onboardingTemplate]);

  // Check if onboarding should be shown based on user preferences
  useEffect(() => {
    const existing = getOnboardingPrefs(currentUser, ONBOARDING_KEY);
    const completedAt = existing?.completedAt;
    const dismissedAt = existing?.dismissedAt;
    if (completedAt) {
      setShowOnboarding(false);
      return;
    }
    if (dismissedAt) {
      setShowOnboarding(false);
      return;
    }
    setShowOnboarding(true);
  }, [currentUser.uiPreferences]);

  // Persist completion status
  useEffect(() => {
    if (onboardingPersistedRef.current) return;
    if (!isAllComplete) return;

    const orgSlug = getWorkspaceOrgSlugFromPathname(pathname);
    if (!orgSlug) return;

    const existing = getOnboardingPrefs(currentUser, ONBOARDING_KEY);
    const completedAt = existing?.completedAt;
    if (completedAt) {
      onboardingPersistedRef.current = true;
      setShowOnboarding(false);
      return;
    }

    onboardingPersistedRef.current = true;
    setShowOnboarding(false);
    (async () => {
      try {
        const uiPreferences = getUiPreferences(currentUser);
        const nextPrefs = {
          ...uiPreferences,
          [ONBOARDING_KEY]: {
            ...existing,
            completedAt: new Date().toISOString(),
          },
        };
        await upsertMyProfile({
          orgSlug,
          updates: { uiPreferences: nextPrefs },
        });
      } catch {
        // ignore
      }
    })();
  }, [isAllComplete, pathname, currentUser]);

  const dismissOnboarding = useCallback(() => {
    setShowOnboarding(false);

    const orgSlug = getWorkspaceOrgSlugFromPathname(pathname);
    if (!orgSlug) return;

    const existing = getOnboardingPrefs(currentUser, ONBOARDING_KEY);
    const completedAt = existing?.completedAt;
    if (completedAt) return;

    (async () => {
      try {
        const uiPreferences = getUiPreferences(currentUser);
        const nextPrefs = {
          ...uiPreferences,
          [ONBOARDING_KEY]: {
            ...existing,
            dismissedAt: new Date().toISOString(),
          },
        };
        await upsertMyProfile({
          orgSlug,
          updates: { uiPreferences: nextPrefs },
        });
      } catch {
        // ignore
      }
    })();
  }, [pathname, currentUser]);

  return {
    showOnboarding,
    onboardingTemplate,
    isLoadingOnboardingTemplate,
    isApplyingOnboardingTemplate,
    setIsApplyingOnboardingTemplate,
    dismissOnboarding,
    setOnboardingTemplate,
  };
}

export function useBillingItems(initialItems: unknown[] | null | undefined, pathname: string | null) {
  const [billingItems, setBillingItems] = useState<unknown[] | null>(() => {
    return Array.isArray(initialItems) ? initialItems : null;
  });
  const [isLoadingBillingItems, setIsLoadingBillingItems] = useState(false);

  const { isLoaded: isClerkLoaded, isSignedIn } = useClerkAuth();

  useEffect(() => {
    if (initialItems !== undefined) return;
    if (billingItems) return;
    if (!isClerkLoaded || !isSignedIn) return;
    const orgSlug = getWorkspaceOrgSlugFromPathname(pathname);
    if (!orgSlug) return;

    let cancelled = false;
    const load = async () => {
      setIsLoadingBillingItems(true);
      try {
        const res = await fetch('/api/nexus/billing', {
          headers: { 'x-org-id': encodeWorkspaceOrgSlug(orgSlug) },
          cache: 'no-store',
        });
        if (!res.ok) return;
        const data = await res.json();
        const items = Array.isArray(data?.billing?.items) ? data.billing.items : null;
        if (!cancelled) setBillingItems(items);
      } catch {
        // ignore
      } finally {
        if (!cancelled) setIsLoadingBillingItems(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [isClerkLoaded, isSignedIn, pathname, initialItems, billingItems]);

  return { billingItems, isLoadingBillingItems, setBillingItems };
}

export function useTourPrompt() {
  const [showTourPrompt, setShowTourPrompt] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const seen = window.localStorage.getItem(TOUR_PROMPT_STORAGE_KEY);
      if (!seen) setShowTourPrompt(true);
    } catch {
      // ignore
    }
  }, []);

  return { showTourPrompt, setShowTourPrompt };
}

export function useShiftTimer(activeShift: { startTime: string } | null) {
  const [elapsed, setElapsed] = useState('00:00:00');

  useEffect(() => {
    if (!activeShift) {
      setElapsed('00:00:00');
      return;
    }
    const updateElapsed = () => {
      const start = new Date(activeShift.startTime).getTime();
      const now = new Date().getTime();
      const diff = now - start;
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setElapsed(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    };
    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [activeShift]);

  return elapsed;
}
