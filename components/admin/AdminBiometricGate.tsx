'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Fingerprint, Lock, ShieldCheck, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

type AuthState = 'checking' | 'locked' | 'unlocked' | 'error' | 'unsupported';

interface AdminBiometricGateProps {
  children: React.ReactNode;
}

function isCapacitorNative(): boolean {
  if (typeof window === 'undefined') return false;
  const w = window as unknown as Record<string, unknown>;
  const cap = w.Capacitor as Record<string, unknown> | undefined;
  return Boolean(cap && cap.isNativePlatform && typeof cap.isNativePlatform === 'function' && (cap.isNativePlatform as () => boolean)());
}

async function performBiometricAuth(): Promise<{ success: boolean; error?: string }> {
  try {
    if (typeof window === 'undefined') return { success: false, error: 'No window' };

    const w = window as unknown as Record<string, unknown>;
    const cap = w.Capacitor as Record<string, unknown> | undefined;
    if (!cap) return { success: false, error: 'Capacitor not available' };

    const Plugins = cap.Plugins as Record<string, unknown> | undefined;
    if (!Plugins) return { success: false, error: 'Plugins not available' };

    const BiometricAuth = Plugins.BiometricAuth as Record<string, (...args: unknown[]) => Promise<unknown>> | undefined;
    if (!BiometricAuth) return { success: false, error: 'BiometricAuth plugin not available' };

    // Check if biometric auth is available
    if (typeof BiometricAuth.checkBiometry === 'function') {
      const biometryResult = await BiometricAuth.checkBiometry() as Record<string, unknown>;
      const isAvailable = biometryResult?.isAvailable;
      if (!isAvailable) {
        // Biometric not available — fallback to device credential
        // Still return success (user can use device PIN/password)
      }
    }

    // Perform authentication
    if (typeof BiometricAuth.authenticate === 'function') {
      await BiometricAuth.authenticate({
        reason: 'נדרש אימות זהות לגישה לפאנל ניהול MISRAD AI',
        title: 'אימות זהות',
        subtitle: 'MISRAD AI Admin',
        description: 'אמת את זהותך כדי להמשיך',
        negativeButtonText: 'ביטול',
        allowDeviceCredential: true,
      });
      return { success: true };
    }

    return { success: false, error: 'authenticate not available' };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('cancel') || message.includes('Cancel')) {
      return { success: false, error: 'cancelled' };
    }
    return { success: false, error: message };
  }
}

export default function AdminBiometricGate({ children }: AdminBiometricGateProps) {
  const [authState, setAuthState] = useState<AuthState>('checking');
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    if (!isCapacitorNative()) {
      // Not a native app — skip biometric gate
      setAuthState('unlocked');
      return;
    }

    // Native app — require biometric auth
    const doAuth = async () => {
      const result = await performBiometricAuth();
      if (result.success) {
        setAuthState('unlocked');
      } else if (result.error === 'cancelled') {
        setAuthState('locked');
      } else if (result.error?.includes('not available') || result.error?.includes('not supported')) {
        setAuthState('unsupported');
      } else {
        setAuthState('error');
        setErrorMsg(result.error || 'Unknown error');
      }
    };

    doAuth();
  }, []);

  const handleRetry = useCallback(async () => {
    setAuthState('checking');
    setErrorMsg('');
    const result = await performBiometricAuth();
    if (result.success) {
      setAuthState('unlocked');
    } else if (result.error === 'cancelled') {
      setAuthState('locked');
    } else {
      setAuthState('error');
      setErrorMsg(result.error || 'Unknown error');
    }
  }, []);

  // Unlocked — show admin content
  if (authState === 'unlocked' || authState === 'unsupported') {
    return <>{children}</>;
  }

  // Checking
  if (authState === 'checking') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-indigo-950 flex items-center justify-center p-6" dir="rtl">
        <div className="text-center">
          <div className="w-20 h-20 bg-indigo-600/20 rounded-3xl flex items-center justify-center mx-auto mb-6 animate-pulse">
            <Fingerprint className="h-10 w-10 text-indigo-400" />
          </div>
          <div className="text-lg font-black text-white mb-2">מאמת זהות...</div>
          <div className="text-sm text-indigo-300">אנא אמת את זהותך</div>
        </div>
      </div>
    );
  }

  // Locked or Error
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-indigo-950 flex items-center justify-center p-6" dir="rtl">
      <div className="max-w-sm w-full text-center">
        {/* Icon */}
        <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 ${
          authState === 'error' ? 'bg-rose-600/20' : 'bg-slate-700/50'
        }`}>
          {authState === 'error' ? (
            <AlertTriangle className="h-10 w-10 text-rose-400" />
          ) : (
            <Lock className="h-10 w-10 text-slate-400" />
          )}
        </div>

        {/* Title */}
        <h1 className="text-xl font-black text-white mb-2">
          {authState === 'error' ? 'שגיאת אימות' : 'הגישה נעולה'}
        </h1>
        <p className="text-sm text-slate-400 mb-8">
          {authState === 'error'
            ? errorMsg || 'שגיאה באימות הזהות. נסה שוב.'
            : 'נדרש אימות זהות בטביעת אצבע או סיסמה כדי לגשת לפאנל הניהול.'
          }
        </p>

        {/* Retry button */}
        <Button
          onClick={handleRetry}
          size="lg"
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl gap-2 h-14 text-base shadow-lg shadow-indigo-600/30"
        >
          <ShieldCheck className="h-5 w-5" />
          אימות זהות
        </Button>

        {/* Branding */}
        <div className="mt-8 text-[11px] text-slate-600">MISRAD AI — Admin Panel</div>
      </div>
    </div>
  );
}
