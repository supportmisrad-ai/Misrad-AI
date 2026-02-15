'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSignIn } from '@clerk/nextjs';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { asObject } from '@/lib/shared/unknown';

type DeviceLoginResponse = {
  success?: boolean;
  error?: string;
  signInToken?: string;
  organizationId?: string | null;
};

function toDeviceLoginResponse(value: unknown): DeviceLoginResponse {
  const obj = asObject(value) ?? {};
  return {
    success: typeof obj.success === 'boolean' ? obj.success : Boolean(obj.success),
    error: obj.error == null ? undefined : String(obj.error),
    signInToken: obj.signInToken == null ? undefined : String(obj.signInToken),
    organizationId: obj.organizationId == null ? null : String(obj.organizationId),
  };
}

function extractToken(text: string): string {
  const raw = String(text || '').trim();
  if (!raw) return '';

  try {
    const url = new URL(raw);
    const fromQuery = url.searchParams.get('token') || url.searchParams.get('t') || '';
    if (fromQuery) return String(fromQuery).trim();
  } catch {
  }

  const m = raw.match(/token=([^&#\s]+)/i);
  if (m?.[1]) return decodeURIComponent(m[1]);

  return raw;
}

function KioskScanPageClient() {
  const router = useRouter();
  const sp = useSearchParams();

  const { isLoaded, signIn, setActive } = useSignIn();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);

  const [error, setError] = useState('');
  const [isBusy, setIsBusy] = useState(false);

  const prefillToken = useMemo(() => {
    const t = sp.get('token') || sp.get('t') || '';
    return String(t).trim();
  }, [sp]);

  const loginWithToken = useCallback(
    async (token: string) => {
      const cleaned = extractToken(token);
      if (!cleaned) return;

      if (isBusy) return;
      setIsBusy(true);
      setError('');

      try {
        const res = await fetch('/api/auth/device-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: cleaned }),
        });

        const raw: unknown = await res.json().catch(() => null);
        const data = toDeviceLoginResponse(raw);
        if (!res.ok || !data?.success) {
          setError(data?.error || 'שגיאה בהתחברות');
          setIsBusy(false);
          return;
        }

        const orgId = data.organizationId ? String(data.organizationId) : null;

        if (!isLoaded || !signIn) {
          setError('המערכת עדיין נטענת. נסה שוב בעוד רגע.');
          setIsBusy(false);
          return;
        }

        const result = await signIn.create({
          strategy: 'ticket',
          ticket: String(data.signInToken),
        } as unknown as Parameters<NonNullable<typeof signIn>['create']>[0]);
        if (result.status === 'complete') {
          await setActive({ session: result.createdSessionId });
          if (orgId) {
            router.push(`/kiosk-home?orgId=${encodeURIComponent(String(orgId))}`);
          } else {
            router.push('/kiosk-home');
          }
          router.refresh();
          return;
        }

        setError('ההתחברות לא הושלמה. נסה שוב.');
      } catch {
        setError('שגיאה בהתחברות');
      } finally {
        setIsBusy(false);
      }
    },
    [isBusy, isLoaded, router, setActive, signIn]
  );

  useEffect(() => {
    if (prefillToken) {
      loginWithToken(prefillToken);
    }
  }, [prefillToken, loginWithToken]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!videoRef.current) return;

    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;

    let cancelled = false;

    reader
      .decodeFromVideoDevice(undefined, videoRef.current, (result: unknown, err: unknown) => {
        if (cancelled) return;
        if (result) {
          const text = (result as { getText: () => string }).getText();
          loginWithToken(text);
        }
        if (err) {
        }
      })
      .catch(() => {
        setError('לא ניתן לפתוח מצלמה. בדוק הרשאות.');
      });

    return () => {
      cancelled = true;
      try {
        const maybeReset = (reader as unknown as { reset?: () => void }).reset;
        if (typeof maybeReset === 'function') maybeReset();
      } catch {
      }
    };
  }, [loginWithToken]);

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6" dir="rtl">
      <div className="max-w-3xl mx-auto">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 md:p-10">
          <div className="text-2xl md:text-4xl font-black">כניסה למסופון (סריקת QR)</div>
          <div className="mt-2 text-white/70 text-sm md:text-base">כוון את המצלמה אל ה-QR שמופיע במסך המנהל</div>

          <div className="mt-6 rounded-3xl border border-white/10 bg-black/30 overflow-hidden">
            <video ref={videoRef} className="w-full aspect-video object-cover" muted playsInline />
          </div>

          {error ? <div className="mt-4 text-red-300 font-bold">{error}</div> : null}
          {isBusy ? <div className="mt-4 text-white/70 font-bold">מתחבר…</div> : null}

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3">
            <button
              onClick={() => router.push('/login')}
              className="rounded-2xl border border-white/15 bg-white/5 px-5 py-4 font-black hover:bg-white/10 transition"
              disabled={isBusy}
            >
              חזרה להתחברות רגילה
            </button>
            <button
              onClick={() => router.push('/kiosk-login')}
              className="rounded-2xl bg-white text-slate-950 px-5 py-4 font-black hover:bg-slate-100 transition"
              disabled={isBusy}
            >
              הצג קוד ידני
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function KioskScanPage() {
  return (
    <Suspense
      fallback={<div className="min-h-screen bg-slate-950 text-white p-6" dir="rtl" />}
    >
      <KioskScanPageClient />
    </Suspense>
  );
}
