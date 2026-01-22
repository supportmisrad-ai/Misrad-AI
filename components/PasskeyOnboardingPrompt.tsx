'use client';

import { useEffect, useMemo, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { Fingerprint, X } from 'lucide-react';

const isMobileDevice = () => {
  if (typeof window === 'undefined') return false;

  const ua = navigator.userAgent || '';
  const uaIsMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const coarsePointer = typeof window.matchMedia === 'function'
    ? window.matchMedia('(pointer: coarse)').matches
    : false;

  return uaIsMobile || coarsePointer;
};

const isPasskeySupported = () => {
  if (typeof window === 'undefined') return false;
  return (
    typeof window.PublicKeyCredential !== 'undefined' &&
    typeof navigator.credentials !== 'undefined' &&
    typeof navigator.credentials.create !== 'undefined'
  );
};

export function PasskeyOnboardingPrompt() {
  const { user, isLoaded } = useUser();

  const [isOpen, setIsOpen] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string>('');

  const storageKey = useMemo(() => {
    const id = user?.id ? String(user.id) : 'anon';
    return `passkey-onboarding-dismissed:${id}`;
  }, [user?.id]);

  useEffect(() => {
    if (!isLoaded) return;

    const run = async () => {
      try {
        setIsChecking(true);
        setError('');

        if (!user) {
          setIsOpen(false);
          return;
        }

        if (!isMobileDevice()) {
          setIsOpen(false);
          return;
        }

        if (!isPasskeySupported()) {
          setIsOpen(false);
          return;
        }

        const dismissed = typeof window !== 'undefined' ? window.localStorage.getItem(storageKey) : '1';
        if (dismissed === '1') {
          setIsOpen(false);
          return;
        }

        try {
          await user.reload();
        } catch {
        }

        const hasPasskeys = Boolean((user as any)?.passkeys?.length);
        setIsOpen(!hasPasskeys);
      } finally {
        setIsChecking(false);
      }
    };

    void run();
  }, [isLoaded, user, storageKey]);

  const dismiss = () => {
    setIsOpen(false);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(storageKey, '1');
    }
  };

  const handleCreate = async () => {
    if (!user) return;

    setError('');
    setIsCreating(true);
    try {
      if (!isPasskeySupported()) {
        setError('זיהוי ביומטרי לא נתמך במכשיר/דפדפן הזה');
        return;
      }

      if (typeof (user as any).createPasskey === 'function') {
        await (user as any).createPasskey({
          name: 'Misrad OS - זיהוי ביומטרי',
        });
      } else if ((user as any).passkeys && typeof (user as any).passkeys.create === 'function') {
        await (user as any).passkeys.create({
          name: 'Misrad OS - זיהוי ביומטרי',
        });
      } else {
        setError('הפיצ׳ר לא זמין כרגע. ודא ש-Passkeys מופעלים ב-Clerk.');
        return;
      }

      dismiss();
    } catch (e: any) {
      const msg = e?.errors?.[0]?.message || e?.message || 'שגיאה בהפעלת זיהוי ביומטרי';
      setError(String(msg));
    } finally {
      setIsCreating(false);
    }
  };

  if (!isLoaded || isChecking || !isOpen) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 md:hidden" dir="rtl">
      <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white/95 backdrop-blur-xl shadow-2xl p-4">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white flex-shrink-0">
            <Fingerprint size={20} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <p className="font-black text-slate-900 text-sm">הפעל Face ID / Touch ID</p>
              <button
                type="button"
                onClick={dismiss}
                className="text-slate-400 hover:text-slate-600 p-1 -m-1"
                aria-label="סגור"
              >
                <X size={18} />
              </button>
            </div>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              להתחברות הבאה תוכל להיכנס במהירות וללא סיסמה באמצעות זיהוי ביומטרי.
            </p>

            {error && (
              <p className="text-xs text-rose-600 font-bold mt-2">
                {error}
              </p>
            )}

            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={handleCreate}
                disabled={isCreating}
                className="flex-1 bg-slate-900 text-white rounded-xl px-4 py-2.5 font-black text-sm disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isCreating ? (
                  <>מפעיל...</>
                ) : (
                  'הפעל עכשיו'
                )}
              </button>
              <button
                type="button"
                onClick={dismiss}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-black text-sm"
              >
                לא עכשיו
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
