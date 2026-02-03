'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSignIn } from '@clerk/nextjs';

type PairingCreateResponse = {
  code: string;
  deviceNonce: string;
  expiresAt: string;
};

type PairingStatusResponse =
  | { status: 'PENDING'; expiresAt?: string | null }
  | { status: 'EXPIRED' }
  | { status: 'NOT_FOUND' }
  | { status: 'APPROVED'; signInToken: string; organizationId: string | null };

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null;
  if (Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function unwrapData(value: unknown): unknown {
  const obj = asObject(value);
  const data = obj?.data;
  if (data && typeof data === 'object') return data;
  return value;
}

function getOrCreateDeviceNonce(): string {
  if (typeof window === 'undefined') return '';
  const key = 'kiosk_device_nonce';
  const existing = localStorage.getItem(key);
  if (existing && existing.length > 0) return existing;
  const nonce = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : String(Date.now());
  localStorage.setItem(key, nonce);
  return nonce;
}

export default function KioskLoginPage() {
  const router = useRouter();
  const { isLoaded, signIn, setActive } = useSignIn();

  const deviceNonce = useMemo(() => getOrCreateDeviceNonce(), []);

  const [code, setCode] = useState<string>('');
  const [expiresAt, setExpiresAt] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isCreating, setIsCreating] = useState<boolean>(true);
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);

  const pollRef = useRef<number | null>(null);
  const pollInFlightRef = useRef(false);
  const pollDelayMsRef = useRef(2000);

  const stopPolling = useCallback(() => {
    if (pollRef.current != null) {
      window.clearTimeout(pollRef.current);
    }
    pollRef.current = null;
  }, []);

  const createCode = useCallback(async () => {
    setIsCreating(true);
    setError('');
    stopPolling();

    try {
      const res = await fetch('/api/kiosk/pairing/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceNonce }),
      });

      if (!res.ok) {
        setError('שגיאה ביצירת קוד. נסה שוב.');
        setIsCreating(false);
        return;
      }

      const raw: unknown = await res.json().catch(() => null);
      const payload = unwrapData(raw) as PairingCreateResponse;
      setCode(String(payload.code || '').toUpperCase());
      setExpiresAt(String(payload.expiresAt || ''));
      setIsCreating(false);
    } catch {
      setError('שגיאה ביצירת קוד. נסה שוב.');
      setIsCreating(false);
    }
  }, [deviceNonce, stopPolling]);

  const pollStatus = useCallback(async (params: { currentCode: string }) => {
    if (pollInFlightRef.current) return;
    pollInFlightRef.current = true;
    try {
      const res = await fetch('/api/kiosk/pairing/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: params.currentCode, deviceNonce }),
      });

      if (!res.ok) {
        pollDelayMsRef.current = Math.min(20_000, Math.max(2_000, pollDelayMsRef.current * 2));
        return;
      }

      const raw: unknown = await res.json().catch(() => null);
      const payload = unwrapData(raw) as PairingStatusResponse;

      // success -> reset delay
      pollDelayMsRef.current = 2000;

      if (payload.status === 'EXPIRED' || payload.status === 'NOT_FOUND') {
        stopPolling();
        await createCode();
        return;
      }

      if (payload.status === 'APPROVED') {
        stopPolling();
        if (!isLoaded || !signIn) {
          setError('המערכת עדיין נטענת. נסה שוב בעוד רגע.');
          return;
        }

        const orgId = payload.organizationId;

        setIsSigningIn(true);
        setError('');

        const result = await signIn.create({
          strategy: 'ticket',
          ticket: payload.signInToken,
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

        setIsSigningIn(false);
        setError('ההתחברות לא הושלמה. נסה ליצור קוד חדש.');
        await createCode();
      }
    } catch {
      pollDelayMsRef.current = Math.min(20_000, Math.max(2_000, pollDelayMsRef.current * 2));
      return;
    } finally {
      pollInFlightRef.current = false;
    }
  }, [createCode, deviceNonce, isLoaded, router, setActive, signIn, stopPolling]);

  useEffect(() => {
    createCode();
    return () => {
      stopPolling();
    };
  }, [createCode, stopPolling]);

  useEffect(() => {
    if (!code || isCreating || isSigningIn) return;

    let cancelled = false;
    stopPolling();
    pollDelayMsRef.current = 2000;

    const tick = async () => {
      if (cancelled) return;
      await pollStatus({ currentCode: code });
      if (cancelled) return;
      pollRef.current = window.setTimeout(() => {
        void tick();
      }, pollDelayMsRef.current);
    };

    void tick();

    return () => {
      cancelled = true;
      stopPolling();
    };
  }, [code, isCreating, isSigningIn, pollStatus, stopPolling]);

  const expiresText = expiresAt
    ? new Date(expiresAt).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6" dir="rtl">
      <div className="w-full max-w-2xl">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 md:p-10 shadow-2xl">
          <div className="text-2xl md:text-4xl font-black">התחברות לטאבלט</div>
          <div className="text-sm md:text-base text-white/70 mt-2">במחשב של המנהל: הגדרות → משתמשים → צמד מכשיר → הזן את הקוד</div>

          <div className="mt-8 rounded-3xl bg-white/10 border border-white/10 p-6 md:p-10 text-center">
            <div className="text-white/70 text-sm">קוד חד־פעמי</div>
            <div className="mt-3 text-5xl md:text-7xl font-black tracking-widest">
              {isCreating ? '…' : code || '—'}
            </div>
            <div className="mt-3 text-white/60 text-sm">
              {expiresText ? `בתוקף עד ${expiresText}` : ''}
            </div>
          </div>

          {error ? <div className="mt-4 text-red-300 font-bold">{error}</div> : null}

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3">
            <button
              onClick={createCode}
              className="bg-white text-slate-950 rounded-2xl px-5 py-4 font-black text-lg hover:bg-slate-100 active:scale-[0.99] transition"
              disabled={isCreating || isSigningIn}
            >
              צור קוד חדש
            </button>
            <button
              onClick={() => router.push('/login')}
              className="bg-transparent border border-white/20 text-white rounded-2xl px-5 py-4 font-black text-lg hover:bg-white/5 active:scale-[0.99] transition"
              disabled={isSigningIn}
            >
              התחברות רגילה
            </button>
          </div>

          {isSigningIn ? <div className="mt-4 text-white/70">מתחבר…</div> : null}
        </div>
      </div>
    </div>
  );
}
