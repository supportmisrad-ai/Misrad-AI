'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth, useSignIn } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';
import { Fingerprint, ShieldCheck, AlertTriangle } from 'lucide-react';
import { getSystemIconUrl } from '@/lib/metadata';

const BIOMETRIC_UNLOCK_KEY = 'pwa_biometric_unlocked';
const BIOMETRIC_SKIP_KEY = 'pwa_biometric_skip_until';
const UNLOCK_DURATION_MS = 5 * 60 * 1000; // 5 minutes - re-lock after inactivity

function isStandaloneMode(): boolean {
  if (typeof window === 'undefined') return false;
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  return isStandalone;
}

function isPasskeySupported(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    typeof window.PublicKeyCredential !== 'undefined' &&
    typeof navigator.credentials !== 'undefined' &&
    typeof navigator.credentials.get !== 'undefined'
  );
}

function isUnlocked(): boolean {
  try {
    const ts = sessionStorage.getItem(BIOMETRIC_UNLOCK_KEY);
    if (!ts) return false;
    const unlockTime = Number(ts);
    if (!Number.isFinite(unlockTime)) return false;
    return Date.now() - unlockTime < UNLOCK_DURATION_MS;
  } catch {
    return false;
  }
}

function markUnlocked(): void {
  try {
    sessionStorage.setItem(BIOMETRIC_UNLOCK_KEY, String(Date.now()));
  } catch {
    // ignore
  }
}

function clearUnlocked(): void {
  try {
    sessionStorage.removeItem(BIOMETRIC_UNLOCK_KEY);
  } catch {
    // ignore
  }
}

function isSkipped(): boolean {
  try {
    const until = sessionStorage.getItem(BIOMETRIC_SKIP_KEY);
    if (!until) return false;
    return Date.now() < Number(until);
  } catch {
    return false;
  }
}

function markSkipped(): void {
  try {
    sessionStorage.setItem(BIOMETRIC_SKIP_KEY, String(Date.now() + UNLOCK_DURATION_MS));
  } catch {
    // ignore
  }
}

export function PwaBiometricGuard({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded } = useAuth();
  const { signIn, setActive, isLoaded: signInLoaded } = useSignIn();
  const pathname = usePathname();

  const [requiresAuth, setRequiresAuth] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');
  const [checked, setChecked] = useState(false);

  // Relock when app is backgrounded / hidden. This makes biometric show again on next entry.
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const onVisibilityChange = () => {
      if (document.visibilityState !== 'visible') {
        clearUnlocked();
      }
    };

    const onPageHide = () => {
      clearUnlocked();
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', onPageHide);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, []);

  // Pages that should never be blocked by biometric
  const isExemptPage = useCallback((p: string) => {
    const lower = String(p || '/').toLowerCase();
    return (
      lower === '/' ||
      lower === '/login' ||
      lower.startsWith('/login') ||
      lower === '/sso-callback' ||
      lower.startsWith('/sign-') ||
      lower === '/reset-password' ||
      lower.startsWith('/reset-password') ||
      lower.startsWith('/invite/') ||
      lower.startsWith('/employee-invite/') ||
      lower.startsWith('/guest/') ||
      lower.startsWith('/kiosk-') ||
      lower === '/maintenance' ||
      lower.startsWith('/pricing') ||
      lower.startsWith('/about') ||
      lower.startsWith('/terms') ||
      lower.startsWith('/privacy') ||
      lower.startsWith('/contact') ||
      lower.startsWith('/support') ||
      lower.startsWith('/accessibility')
    );
  }, []);

  useEffect(() => {
    if (!isLoaded) return;

    // Only enforce in standalone (installed) mode
    if (!isStandaloneMode()) {
      setChecked(true);
      setRequiresAuth(false);
      return;
    }

    // Don't block exempt pages (login, landing, etc.)
    if (isExemptPage(pathname || '/')) {
      setChecked(true);
      setRequiresAuth(false);
      return;
    }

    // Don't block if not signed in (they'll hit the login page naturally)
    if (!isSignedIn) {
      setChecked(true);
      setRequiresAuth(false);
      return;
    }

    // Don't block if biometric is not supported
    if (!isPasskeySupported()) {
      setChecked(true);
      setRequiresAuth(false);
      return;
    }

    // Already unlocked this session?
    if (isUnlocked() || isSkipped()) {
      setChecked(true);
      setRequiresAuth(false);
      return;
    }

    // Require biometric auth
    setChecked(true);
    setRequiresAuth(true);
  }, [isLoaded, isSignedIn, pathname, isExemptPage]);

  const handleBiometricAuth = useCallback(async () => {
    if (!signInLoaded || !signIn) return;

    setIsVerifying(true);
    setError('');

    try {
      const result = await signIn.authenticateWithPasskey({});

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        markUnlocked();
        setRequiresAuth(false);
        return;
      }

      setError('האימות לא הושלם. נסה שוב.');
    } catch (err: unknown) {
      const errObj = err as { errors?: Array<{ code?: string; message?: string }>; message?: string };
      const code = errObj?.errors?.[0]?.code || '';
      const msg = errObj?.errors?.[0]?.message || errObj?.message || '';

      // User cancelled - don't show error
      if (code === 'passkey_retrieval_cancelled' || msg.includes('cancelled')) {
        setIsVerifying(false);
        return;
      }

      // No passkey found - skip biometric for this session
      if (code === 'passkey_not_found' || msg.includes('passkey')) {
        markSkipped();
        setRequiresAuth(false);
        return;
      }

      setError('שגיאה באימות ביומטרי. נסה שוב או דלג.');
    } finally {
      setIsVerifying(false);
    }
  }, [signIn, signInLoaded, setActive]);

  const handleSkip = useCallback(() => {
    markSkipped();
    setRequiresAuth(false);
  }, []);

  // Auto-trigger biometric on mount
  useEffect(() => {
    if (requiresAuth && checked && !isVerifying) {
      handleBiometricAuth();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requiresAuth, checked]);

  // Not checked yet or doesn't require auth - show children
  if (!checked || !requiresAuth) {
    return <>{children}</>;
  }

  // Show biometric lock screen
  return (
    <div
      className="fixed inset-0 z-[9999] bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center"
      dir="rtl"
    >
      <div className="text-center max-w-sm px-6">
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center overflow-hidden">
          <img
            src={getSystemIconUrl('misrad')}
            alt="MISRAD AI"
            className="w-12 h-12 object-contain"
          />
        </div>

        <h1 className="text-2xl font-black text-white mb-2">MISRAD AI</h1>
        <p className="text-slate-400 text-sm font-bold mb-8">
          נדרש אימות ביומטרי כדי לגשת למערכת
        </p>

        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 flex items-center gap-2">
            <AlertTriangle size={16} className="text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-300 font-bold">{error}</p>
          </div>
        )}

        <button
          type="button"
          onClick={handleBiometricAuth}
          disabled={isVerifying}
          className="w-full bg-white text-slate-900 font-black py-4 rounded-2xl text-lg flex items-center justify-center gap-3 shadow-xl shadow-white/10 hover:bg-slate-100 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed mb-3"
        >
          {isVerifying ? (
            <>
              <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin" />
              מאמת...
            </>
          ) : (
            <>
              <Fingerprint size={22} />
              אימות ביומטרי
            </>
          )}
        </button>

        <button
          type="button"
          onClick={handleSkip}
          className="w-full text-slate-400 font-bold py-3 rounded-xl text-sm hover:text-white transition-colors"
        >
          דלג הפעם
        </button>

        <div className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-500">
          <ShieldCheck size={14} />
          <span>מוגן באמצעות Face ID / Touch ID</span>
        </div>
      </div>
    </div>
  );
}
