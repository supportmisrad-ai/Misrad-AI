'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { useEffect, useState } from 'react';

const LEGAL_CONSENT_STORAGE_KEY = 'pending_legal_consent_v1';

const PasskeyOnboardingPrompt = dynamic(
  () => import('@/components/PasskeyOnboardingPrompt').then((m) => m.PasskeyOnboardingPrompt),
  { ssr: false, loading: () => null }
);

const PwaBiometricGuard = dynamic(
  () => import('@/components/PwaBiometricGuard').then((m) => m.PwaBiometricGuard),
  { ssr: false, loading: () => null }
);

const PWAInstaller = dynamic(
  () => import('@/components/PWAInstaller').then((m) => m.PWAInstaller),
  { ssr: false, loading: () => null }
);

const VoiceCommandFab = dynamic(
  () => import('@/components/voice/VoiceCommandFab').then((m) => m.VoiceCommandFab),
  { ssr: false, loading: () => null }
);

const AiAssistantWidget = dynamic(
  () => import('@/components/ai/AiAssistantWidget').then((m) => m.AiAssistantWidget),
  { ssr: false, loading: () => null }
);

const ComingSoonPortal = dynamic(() => import('@/components/shared/ComingSoonPortal'), {
  ssr: false,
  loading: () => null,
});

const NativeAppUpdatePrompt = dynamic(
  () => import('@/components/system/NativeAppUpdatePrompt').then((m) => m.NativeAppUpdatePrompt),
  { ssr: false, loading: () => null }
);

const GlobalSupportModal = dynamic(
  () => import('@/components/shared/GlobalSupportModal').then((m) => m.GlobalSupportModal),
  { ssr: false, loading: () => null }
);

const GlobalSearchModal = dynamic(
  () => import('@/components/shared/GlobalSearchModal').then((m) => m.GlobalSearchModal),
  { ssr: false, loading: () => null }
);

const SiteAnalyticsTracker = dynamic(
  () => import('@/components/shared/SiteAnalyticsTracker').then((m) => m.SiteAnalyticsTracker),
  { ssr: false, loading: () => null }
);


function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  return mounted;
}

function isSalesPathname(pathname: string): boolean {
  const p = String(pathname || '/').toLowerCase();
  if (p.startsWith('/w/')) return false;
  if (p === '/admin' || p.startsWith('/admin/')) return false;
  if (p === '/app/admin' || p.startsWith('/app/admin/')) return false;
  if (p === '/me') return false;
  if (p === '/login' || p.startsWith('/login/')) return false;
  if (p === '/sign-in' || p.startsWith('/sign-in/')) return false;
  if (p === '/sign-up' || p.startsWith('/sign-up/')) return false;
  if (p === '/sign-out' || p.startsWith('/sign-out/')) return false;
  if (p === '/reset-password' || p.startsWith('/reset-password/')) return false;
  if (p === '/shabbat' || p.startsWith('/shabbat/')) return false;
  return true;
}

function shouldLoadWidgets(pathname: string): boolean {
  const p = String(pathname || '/').toLowerCase();
  // Load widgets on all pages except auth/admin/shabbat pages
  if (p.startsWith('/w/')) return false; // workspace pages
  if (p === '/admin' || p.startsWith('/admin/')) return false;
  if (p === '/app/admin' || p.startsWith('/app/admin/')) return false;
  if (p === '/me') return false;
  if (p === '/login' || p.startsWith('/login/')) return false;
  if (p === '/sign-in' || p.startsWith('/sign-in/')) return false;
  if (p === '/sign-up' || p.startsWith('/sign-up/')) return false;
  if (p === '/sign-out' || p.startsWith('/sign-out/')) return false;
  if (p === '/reset-password' || p.startsWith('/reset-password/')) return false;
  if (p === '/shabbat' || p.startsWith('/shabbat/')) return false;
  return true;
}

function LegalConsentSync() {
  const { isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    if (typeof window === 'undefined') return;

    let payloadRaw: string | null = null;
    try {
      payloadRaw = window.localStorage.getItem(LEGAL_CONSENT_STORAGE_KEY);
    } catch {
      payloadRaw = null;
    }

    if (!payloadRaw) return;

    let canceled = false;

    const run = async () => {
      for (let i = 0; i < 6 && !canceled; i++) {
        try {
          const res = await fetch('/api/legal/consent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ acceptTerms: true, acceptPrivacy: true }),
          });

          if (res.ok) {
            try {
              const data = (await res.json()) as { ok?: boolean; pending?: boolean };
              if (data?.pending) {
                await new Promise((r) => setTimeout(r, 750));
                continue;
              }
              window.localStorage.removeItem(LEGAL_CONSENT_STORAGE_KEY);
            } catch {
              // ignore
            }
            return;
          }

          if (res.status === 409) {
            await new Promise((r) => setTimeout(r, 750));
            continue;
          }

          return;
        } catch {
          await new Promise((r) => setTimeout(r, 750));
        }
      }
    };

    run();

    return () => {
      canceled = true;
    };
  }, [isLoaded, isSignedIn]);

  return null;
}

export function ClientOnlyClerkWidgets() {
  const pathname = usePathname();
  const shouldLoad = shouldLoadWidgets(pathname || '/');
  const showFAB = isSalesPathname(pathname || '/');
  const mounted = useMounted();
  const [enableAiAssistant, setEnableAiAssistant] = useState(false);
  const [enablePasskeyPrompt, setEnablePasskeyPrompt] = useState(false);
  const p = String(pathname || '/');
  const isAuthenticated = p.startsWith('/w/');

  useEffect(() => {
    if (!mounted || !shouldLoad) return;
    let cancelled = false;

    const enable = () => {
      if (cancelled) return;
      setEnablePasskeyPrompt(true);
    };

    const w = window as unknown as { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };
    if (typeof w.requestIdleCallback === 'function') {
      const id = w.requestIdleCallback(enable, { timeout: 3000 });
      return () => {
        cancelled = true;
        try {
          w.cancelIdleCallback?.(id);
        } catch {
        }
      };
    }

    const t = window.setTimeout(enable, 2000);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [mounted, shouldLoad]);

  useEffect(() => {
    if (!mounted || !showFAB || !shouldLoad) return;
    let cancelled = false;

    const enable = () => {
      if (cancelled) return;
      setEnableAiAssistant(true);
    };

    const w = window as unknown as { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };
    if (typeof w.requestIdleCallback === 'function') {
      const id = w.requestIdleCallback(enable, { timeout: 3000 });
      return () => {
        cancelled = true;
        try {
          w.cancelIdleCallback?.(id);
        } catch {
        }
      };
    }

    const t = window.setTimeout(enable, 2000);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [mounted, showFAB, shouldLoad]);

  return (
    <>
      <LegalConsentSync />
      {shouldLoad && mounted && enablePasskeyPrompt && isAuthenticated && <PasskeyOnboardingPrompt />}
      {shouldLoad && mounted && showFAB && enableAiAssistant && <AiAssistantWidget />}
    </>
  );
}

export function ClientOnlyPwaBiometricGuard({ children }: { children: React.ReactNode }) {
  const mounted = useMounted();
  if (!mounted) return <>{children}</>;
  return <PwaBiometricGuard>{children}</PwaBiometricGuard>;
}

export function ClientOnlyGlobalWidgets() {
  const pathname = usePathname();
  const shouldLoad = shouldLoadWidgets(pathname || '/');
  const mounted = useMounted();
  const [enableGlobalWidgets, setEnableGlobalWidgets] = useState(false);

  useEffect(() => {
    if (!mounted || !shouldLoad) return;
    let cancelled = false;

    const enable = () => {
      if (cancelled) return;
      setEnableGlobalWidgets(true);
    };

    const w = window as unknown as { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };
    if (typeof w.requestIdleCallback === 'function') {
      const id = w.requestIdleCallback(enable, { timeout: 3000 });
      return () => {
        cancelled = true;
        try {
          w.cancelIdleCallback?.(id);
        } catch {
        }
      };
    }

    const t = window.setTimeout(enable, 2000);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [mounted, shouldLoad]);

  return (
    <>
      {shouldLoad && mounted && enableGlobalWidgets && <PWAInstaller />}
      {shouldLoad && mounted && enableGlobalWidgets && <VoiceCommandFab />}
      {shouldLoad && mounted && enableGlobalWidgets && <ComingSoonPortal />}
      {shouldLoad && mounted && enableGlobalWidgets && <NativeAppUpdatePrompt />}
      {shouldLoad && mounted && enableGlobalWidgets && <GlobalSupportModal />}
      {shouldLoad && mounted && enableGlobalWidgets && <GlobalSearchModal />}
      {mounted && <SiteAnalyticsTracker />}
    </>
  );
}
